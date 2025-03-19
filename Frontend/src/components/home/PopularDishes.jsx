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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PopularDishes;
