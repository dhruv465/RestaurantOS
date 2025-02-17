import React from "react";
import BottomNav from "../components/ui/BottomNav";
import Greetings from "../components/home/Greetings";
import MiniCard from "../components/home/MiniCard";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import RecentOders from "../components/home/RecentOders";

const Home = () => {
  return (
    <div className="flex flex-col h-screen">
      <section className="bg-[var(--main-bg)] flex-1 overflow-y-auto flex flex-col md:flex-row">
        {/* Main Content */}
        <div className="flex flex-col md:flex-[3]">
          <Greetings />
          <div className="flex flex-col md:flex-row items-center w-full gap-3 px-4 md:px-8 mt-8">
            <MiniCard title="Total Earnings" icon={<BsCashCoin />} value="200" footerNum={1.6} />
            <MiniCard title="In Progress" icon={<GrInProgress />} value="200" footerNum={3.6} />
          </div>
          <RecentOders />
        </div>

        {/* Right Div */}
        <div className="flex-[2] bg-[var(--card-bg)] mt-8 md:mt-0">
          <div className="w-full h-full p-4 md:p-8 flex flex-col justify-center items-center">
            <h1 className="text-2xl md:text-4xl text-[var(--text-color)] font-bold">RestOS</h1>
            <p className="text-[var(--text-color)] text-base md:text-xl mt-2">Restaurant Management System</p>
          </div>
        </div>
      </section>
      <BottomNav />
    </div>
  );
};

export default Home;
