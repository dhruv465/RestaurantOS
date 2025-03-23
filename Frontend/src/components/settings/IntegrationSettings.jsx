import React from "react";

const IntegrationSettings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">
            Food Delivery Integrations
          </h2>
          <p className="text-sm text-[#ababab]">
            Connect with popular food delivery platforms
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-5">
            {["Uber Eats", "Zomato", "Swiggy"].map((service) => (
              <div key={service} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg hover:bg-[var(--input-bg)]/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-color)]">{service}</p>
                    <p className="text-sm text-[#ababab]">Connect your menu with {service} delivery service</p>
                  </div>
                </div>
                <button className="border border-[var(--border-color)] text-[var(--text-color)] bg-[var(--card-bg)] px-3 py-1 text-sm rounded-lg hover:bg-[var(--input-bg)] transition-colors">
                  Connect
                </button>
              </div>
            ))}
          </div>

          <div className="h-px bg-[var(--border-color)] w-full my-6"></div>

          <div className="space-y-4">
            <h3 className="font-medium text-base text-[var(--text-color)]">Add Custom Integration</h3>
            <p className="text-sm text-[#ababab]">
              Connect with other food delivery services by providing their API details
            </p>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="integration-name" className="block text-[#ababab] text-sm font-medium">
                  Integration Name
                </label>
                <input
                  id="integration-name"
                  type="text"
                  placeholder="e.g., DoorDash, Deliveroo"
                  className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="api-key" className="block text-[#ababab] text-sm font-medium">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettings;
