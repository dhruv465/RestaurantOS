import React, { useEffect, useState } from "react";
import { getItems } from "../../https/index";
import Loader from "../ui/Loader";

const PopularDishes = () => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const placeholderImage = "path/to/placeholder/image.jpg";

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        // Use the imported API function instead of direct fetch
        const response = await getItems();

        // Fetch images for each dish
        const dishesWithImages = await Promise.all(
          response.data.data.map(async (dish) => {
            try {
              const imageResponse = await fetch(
                `https://api.pexels.com/v1/search?query=${dish.name}`,
                {
                  headers: {
                    Authorization:
                      "SkVR252YitQPdV3tZinL841RtZhYvBkCIdWtVMQA32T0kkC8SxCzMoe2",
                  },
                }
              );

              const imageData = await imageResponse.json();
              const imageUrl =
                imageData.photos.length > 0
                  ? imageData.photos[0].src.medium
                  : placeholderImage;

              return { ...dish, image: imageUrl };
            } catch (error) {
              // If image fetch fails, use placeholder
              return { ...dish, image: placeholderImage };
            }
          })
        );

        setDishes(dishesWithImages);
      } catch (error) {
        console.error("Error fetching popular dishes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, []);

  return (
    <div className="mt-6 pr-6 px-4">
      <div className="bg-[var(--card-bg)] w-full rounded-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-[var(--text-color)] text-lg font-semibold tracking-wide">
            Popular Dishes
          </h1>
          <button className="text-[var(--text-color)] text-sm md:text-base bg-[var(--card-bg)] px-3 md:px-4 py-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-y-auto h-[680px] scrollbar-hide">
          {loading ? (
            <Loader />
          ) : dishes.length > 0 ? (
            dishes.map((dish) => (
              <div
                key={dish._id}
                className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-color)]"
              >
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-16 h-16 rounded-lg"
                />
                <div>
                  <h1 className="text-[var(--text-color)] text-lg font-semibold">
                    {dish.name}
                  </h1>
                  <p className="text-[var(--text-color)] text-sm">
                    <span className="text-[#ababab]">Price: </span>₹{dish.price}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <div className="w-24 h-24 mb-4 rounded-full bg-[var(--main-bg)] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </div>
              <h2 className="text-[var(--text-color)] text-xl font-semibold mb-2">
                No Popular Dishes Yet
              </h2>
              <p className="text-[#ababab] text-sm max-w-md mb-6">
                You haven't added any popular dishes to showcase yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopularDishes;
