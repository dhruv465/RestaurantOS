🟢 Restaurant Registration Flow Blueprint

⸻

Step 1: Basic Restaurant Info

Field	Input Type	Notes/UX Hint
Restaurant Name	Text field	Required, auto-suggest if existing client
Restaurant Type	Dropdown	Fine Dining, Casual Dining, QSR, Café, etc.
Cuisine(s)	Multi-select dropdown	Allow multiple cuisines with tags
Seating Capacity	Number input	Optional tooltip explaining dine-in seats
Dining Style	Radio buttons	Veg, Non-Veg, Both
Year Established	Dropdown (years)	Optional



⸻

Step 2: Owner / Admin Details

Field	Input Type	Notes/UX Hint
Owner/Administrator Name	Text field	Required
Contact Number	Phone input	Mobile-friendly, OTP later
Email Address	Email input	This will be the login/primary email
Designation/Role	Dropdown	Owner, Manager, Franchisee, etc.
Alternate Contact	Email/Phone (optional)	Optional backup contact info



⸻

Step 3: Address & Location

Field	Input Type	Notes/UX Hint
Address Line 1	Text field	Street, building, etc.
Address Line 2	Text field (optional)	Extra details (area, complex)
Landmark/Locality	Text field	Optional
City/Town	Dropdown + search	Auto-complete with Indian cities
State	Dropdown	Pre-filled with Indian states
PIN Code	Number input	6-digit PIN validation
Google Maps Link	URL input (optional)	Embed map preview if added



⸻

Step 4: Tax & Compliance

Field	Input Type	Notes/UX Hint
GSTIN	Text input	15-char GST validation pattern
FSSAI License Number	Text input	Optional but recommended
PAN	Text input	10-char PAN validation
Business Registration No.	Text input (optional)	Optional (e.g., Shop & Establishment)
Invoice Prefix & Start No.	Text + Number	Optional, autofill defaults



⸻

Step 5: Banking & Payout Info

Field	Input Type	Notes/UX Hint
Account Holder Name	Text input	Name as per bank
Bank Name	Dropdown + search	Popular Indian banks prefilled
Account Number	Number input	Mask sensitive digits
IFSC Code	Text input	Validate IFSC using regex
UPI ID	Text input (optional)	Validate format e.g., abc@upi
Preferred Payout Method	Radio buttons	Bank Transfer (default) or UPI



⸻

Step 6: Operational Preferences

Field	Input Type	Notes/UX Hint
Business Hours	Time picker grid	Day-wise open/close hours
Weekly Off	Multi-select	Allow to mark closed days
Service Modes	Toggle switches	Dine-In, Takeaway, Delivery, etc.
Delivery Radius (km)	Slider input	Optional, appears if delivery is selected
Table Management Required?	Toggle (Yes/No)	If yes, prompt for number of tables
KDS / KOT Printing Setup	Toggle (Yes/No)	If yes, show further hardware setup later



⸻

Step 7: Branding & Media

Field	Input Type	Notes/UX Hint
Logo Upload	Image upload	JPG/PNG + preview
Tagline	Text input (optional)	Short description
Restaurant Photos	Multi-image upload	Drag & drop support
Theme Color	Color picker	Optional brand color setup



⸻

Step 8: Franchise & Branch Info

Field	Input Type	Notes/UX Hint
Is this part of a franchise?	Yes/No toggle	If Yes, show next fields
Parent Brand/Company Name	Text input	Optional for single branches
Branch Name	Text input	Distinguish branch names
Branch Code (optional)	Text input	For internal branch codes
No. of Branches (if applicable)	Number input	If multi-branch setup



⸻

Step 9: Account Settings

Field	Input Type	Notes/UX Hint
Primary Account Email	Email input	This email receives all system notifications
Password	Password field	With strength indicator
Contact Person for POS	Text input	POS manager/admin name
Phone for POS Manager	Phone input	Support & login purposes
Preferred Language	Dropdown	English / Hindi (add more in future)
Time Zone	Auto-filled IST	Optional for global future
Terms & Conditions Checkbox	Checkbox	Must accept to proceed
Newsletter Opt-in	Checkbox (optional)	For updates/offers



⸻

🎯 UX Recommendations:
	•	Progress Indicator: Show a progress bar or step tracker (Step 1 of 9) on the top.
	•	Save as Draft: Option to save form and complete later (especially useful for busy restaurant owners).
	•	Tooltips & Inline Help: Small info icons next to fields like GST, IFSC, UPI.
	•	Mobile Responsive: Optimized for mobile-first, given many owners will likely complete this on their phones.
	•	Conditional Logic: For example, show KDS/Printer setup only if “Yes” to kitchen hardware.

⸻
