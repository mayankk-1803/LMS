import React, { useContext } from "react";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { AppContext } from "../../context/AppContext";

const Navbar = () => {

  const {navigate , isEducator} = useContext(AppContext)

  const isCourseListPage = location.pathname.includes("/course-list");
  const {openSignIn} = useClerk()
  const {user} = useUser()

  return (
    <div
      className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500   ${
        isCourseListPage ? "bg-white" : "bg-purple-500/70"
      }`}
    >
      <img
        onClick={() => navigate('/')}
        src={assets.logo}
        alt="logo"
        className="w-24  lg:w-32 cursor-pointer"
      />
      <div className="hidden md:flex items-center gap-5 text-black">
        <div className="flex items-center gap-5">
          {user && <>
            <button onClick={() => {navigate('/educator')}}>{isEducator ? 'Educator Dashboard' : 'Become Educator'} </button>|
          <Link to="/my-enrollments">My Enrollments</Link></>
          }
        </div>
       { user ? <UserButton /> : 
        <button onClick={()=> openSignIn()} className="bg-purple-900 text-white mx-5 py-2 px-4 rounded-full">
          Create Account
        </button>}
      </div>

      {/* for small screens */}


      <div className="md:hidden flex items-center gap-2 sm:gap-5 text-black">
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          {user && <>
            <button onClick={() => {navigate('/educator')}}>{isEducator ? 'Educator Dashboard' : 'Become Educator'}</button>|
          <Link to="/my-enrollments">My Enrollments</Link></>
          }
        </div>
        {
          user ? <UserButton /> :<button onClick={() => openSignIn()}>
          <img src={assets.user_icon} alt="" />
        </button>
        }
      </div>
    </div>
  );
};

export default Navbar;
