import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { response } from "express";
import Purchase from "../models/purchase.js";
import Course from "../models/course.js";

// API controller function 

export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp" : req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const {data, type} = req.body

        switch (type) {
            case 'user.created': {
                const userData ={
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }
                await User.create(userData)
                res.json({})
                break;
            }

            case 'user.updated' :{
                const userData ={
                    email: data.email_address[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({})
                break;
            }

            case 'user.deleted' : {
                await User.findByIdAndDelete(data.id)
                res.json({})
                break;
            }
        
            default:
                break;
        }

    } catch (error) {
        res.json({success: false, message: error.message})
    }
}


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle checkout completion
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;

      const purchaseId = session.metadata?.purchaseId;

      if (!purchaseId) {
        console.error("Missing purchaseId in metadata");
        return res.status(400).send("Missing purchaseId");
      }

      const purchaseData = await Purchase.findById(purchaseId);
      if (!purchaseData) return res.status(404).json({ success: false, message: "Purchase not found" });

      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId);

      if (!userData || !courseData) {
        return res.status(404).json({ success: false, message: "User or Course not found" });
      }

      // ✅ Prevent duplicates
      if (!userData.enrolledCourses.includes(courseData._id)) {
        userData.enrolledCourses.push(courseData._id);
        await userData.save();
      }

      if (!courseData.enrolledStudents.includes(userData._id)) {
        courseData.enrolledStudents.push(userData._id);
        await courseData.save();
      }

      // ✅ Update purchase status
      purchaseData.status = "completed";
      await purchaseData.save();

      return res.status(200).json({ received: true });

    } catch (err) {
      console.error("Error processing session completion:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Handle payment failure
  if (event.type === "payment_intent.payment_failed") {
    try {
      const paymentIntent = event.data.object;
      const intentId = paymentIntent.id;

      const sessionList = await stripeInstance.checkout.sessions.list({
        payment_intent: intentId,
      });

      const session = sessionList.data[0];
      const purchaseId = session?.metadata?.purchaseId;

      if (purchaseId) {
        await Purchase.findByIdAndUpdate(purchaseId, { status: "failed" });
      }
    } catch (error) {
      console.error("Error handling failed payment:", error);
    }
  }

  res.status(200).json({ received: true });
};