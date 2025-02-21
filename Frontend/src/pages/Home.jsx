import React from "react";
import BottomNav from "../components/ui/BottomNav";
import Greetings from "../components/home/Greetings";
import MiniCard from "../components/home/MiniCard";
import { BsCashCoin } from "react-icons/bs";
import { GrInProgress } from "react-icons/gr";
import RecentOders from "../components/home/RecentOders";
import PopularDishes from "../components/home/PopularDishes";

const Home = () => {
  return (
    <div className="flex flex-col ">
      <section className="bg-[var(--main-bg)] flex-1 overflow-auto flex flex-col md:flex-row min-h-screen pb-20">
        {/* Main Content */}
        <div className="flex flex-col md:flex-[3]">
          <Greetings />
          <div className="flex flex-col md:flex-row items-center w-full gap-3 px-4 md:px-8 mt-8">
            <MiniCard title="Total Earnings" icon={<BsCashCoin />} number="512" footerNum={1.6} />
            <MiniCard title="In Progress" icon={<GrInProgress />} number="16" footerNum={3.6} />
          </div>
          <RecentOders />
        </div>

        {/* Right Div */}
        <div className="flex-[2]  mt-8 md:mt-0">
          <PopularDishes />
        </div>
      </section>
      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
};

export default Home;
