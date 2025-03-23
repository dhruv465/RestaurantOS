import React, { useState } from "react";
import { FaCamera, FaImage } from "react-icons/fa";

const ProfileSettings = ({ 
  restaurantName, 
  setRestaurantName, 
  description, 
  setDescription, 
  contactNumber, 
  setContactNumber, 
  address, 
  setAddress, 
  logoPreview, 
  setLogoPreview 
}) => {
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">
            Profile Information
          </h2>
          <p className="text-sm text-[#ababab]">
            Update your restaurant profile details
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="restaurant-name"
                className="block text-[#ababab] text-sm font-medium"
              >
                Restaurant Name
              </label>
              <input
                id="restaurant-name"
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Your Restaurant Name"
                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-[#ababab] text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your restaurant"
                className="w-full min-h-[120px] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="contact"
                className="block text-[#ababab] text-sm font-medium"
              >
                Contact Number
              </label>
              <input
                id="contact"
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="address"
                className="block text-[#ababab] text-sm font-medium"
              >
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your restaurant's address"
                className="w-full min-h-[80px] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">
            Restaurant Logo
          </h2>
          <p className="text-sm text-[#ababab]">
            Upload your restaurant logo
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="relative w-40 h-40 border-2 border-dashed border-[var(--border-color)]/25 rounded-xl overflow-hidden flex items-center justify-center bg-[var(--input-bg)]/50">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Restaurant logo preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#ababab]">
                  <FaImage className="w-12 h-12" />
                  <span className="text-xs">No logo uploaded</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 flex-1">
              <div className="space-y-2">
                <label
                  htmlFor="logo-upload"
                  className="block text-[#ababab] text-base font-medium"
                >
                  Upload Logo
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)] cursor-pointer"
                />
              </div>
              <div className="bg-[var(--input-bg)]/40 p-3 rounded-lg text-sm text-[#ababab]">
                <p className="flex items-center gap-2">
                  <FaCamera className="h-4 w-4" />
                  Recommended: Square image, at least 512x512px
                </p>
                <p className="mt-1">
                  Your logo will appear on receipts, the app header, and
                  your restaurant profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
