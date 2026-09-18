Create a complete desktop web application prototype from scratch called "My Little Debugger".

ABOUT THE PRODUCT:
My Little Debugger is an AI-powered debugging assistant designed for beginner programmers. The system helps users upload Python, Java, and C# source code files, automatically detects errors, explains errors in simple language, suggests fixes, stores debugging history, and provides support through a friendly animated AI assistant called "Debug Buddy".

TARGET USERS:

* Beginner programmers
* University computer science students
* Coding bootcamp learners

DESIGN STYLE:

* Modern SaaS web application
* Purple to pink gradient branding
* Soft shadows
* Rounded cards
* Clean spacing
* Beginner-friendly interface
* High accessibility and strong contrast
* Friendly educational feel
* Animated avatar assistant visible throughout the system

IMPORTANT:
This must be a FULLY CLICKABLE prototype with NO dead buttons.
Every button, navigation item, form, modal, and screen must be connected.

COMPLETE USER FLOW:
Registration → Authentication → Login → Dashboard → Upload Code → Analyze Code → Results → Chat Assistant → Error History → Report Generation → Settings → Logout

==================================================
SCREEN 1: REGISTRATION
======================

Create registration page with:

* Logo
* Tagline: "Your friendly AI debugging companion"
* Full name field
* Email field
* Password field
* Confirm password field
* Register button
* Link to login

Interaction:
When clicking Register:

* Validate form
* Navigate to authentication success screen

==================================================
SCREEN 2: AUTHENTICATION
========================

Show:

* Success animation
* Avatar saying:
  "Welcome to My Little Debugger! Your account has been created successfully."

Button:

* Continue to Login

Interaction:
Continue button navigates to Login screen.

==================================================
SCREEN 3: LOGIN
===============

Include:

* Email field
* Password field
* Remember me checkbox
* Forgot password
* Login button

LOGIN MUST IMPLEMENT ROLE-BASED ACCESS.

AUTHORIZED ADMIN ACCOUNTS:

Admin 1:
Email: [202304366@spu.ac.za](mailto:202304366@spu.ac.za)
Password: Spu@123

Admin 2:
Email: [202348840@spu.ac.za](mailto:202348840@spu.ac.za)
Password: Spu@234

Admin 3:
Email: [202341594@spu.ac.za](mailto:202341594@spu.ac.za)
Password: Spu@345

Admin 4:
Email: [202407408@spu.ac.za](mailto:202407408@spu.ac.za)
Password: Spu@456

LOGIN LOGIC:

IF email matches one of the admin accounts:

* Assign role = Administrator
* Show Admin Panel in sidebar
* Avatar says:
  "Welcome back, Administrator."

IF email does not match admin list:

* Assign role = Standard User
* Hide Admin Panel
* Show normal dashboard

Login button must navigate to dashboard.

==================================================
SCREEN 4: DASHBOARD
===================

Dashboard layout with:

Sidebar:

* Dashboard
* Upload Code
* Error History
* Reports
* Settings
* Logout

IF Administrator:
Also show:

* Admin Panel

Main area:

* Welcome card
* Recent debugging sessions
* Quick statistics
* AI assistant widget

Avatar always visible bottom-right.

Every navigation button must work.

==================================================
SCREEN 5: CODE UPLOAD
=====================

Create upload interface.

VERY IMPORTANT:
Fix user testing issue where students struggled with uploading.

Add clear visual step-by-step instructions:

Step 1: Click Choose File
Step 2: Select your .py, .java, or .cs file
Step 3: Click Analyze Code
Step 4: Review highlighted errors and suggested fixes

Use numbered cards with icons.

Upload section:

* Large drag-and-drop area
* Supported formats displayed

Buttons:

* Choose File
* Analyze Code

When user clicks Choose File:

Open realistic file picker modal.

Allow choosing:

* Main.java
* Calculator.py
* Program.cs
* StudentProject.java
* App.py

After selection:

* Display selected file name
* Enable Analyze Code button

NO fake preloaded file.

==================================================
SCREEN 6: ANALYZE CODE
======================

When Analyze Code is clicked:

Show loading animation.

Avatar says:
"Analyzing your code..."

Then navigate to analysis results.

==================================================
SCREEN 7: ERROR ANALYSIS RESULTS
================================

Show:

* Uploaded file name
* Syntax highlighted code editor
* Error line highlighting
* Beginner-friendly explanations
* Suggested fixes

Buttons:

* Ask Debug Buddy
* Save Report
* View History

IMPORTANT:

After every analysis:

Automatically save uploaded file into Error History.

==================================================
SCREEN 8: CHAT ASSISTANT
========================

Chat interface with avatar named:

"Debug Buddy"

Quick action buttons:

* Explain Error
* Fix This
* Optimize Code
* Why Did This Fail?

Chat must be interactive.

==================================================
SCREEN 9: ERROR HISTORY
=======================

Create automatically populated history screen.

Every analyzed file is saved.

Each record must show:

* File name
* Programming language
* Upload date
* Error count
* Status

Examples:

Main.java — Java — 2 errors
Calculator.py — Python — 0 errors
Program.cs — C# — 1 error

Newest uploads appear first.

Clicking any history item reopens that analysis.

==================================================
SCREEN 10: REPORT GENERATION
============================

Show:

* Error summary
* File details
* Suggested fixes
* Performance suggestions

Buttons:

* Export PDF
* Save Session
* Return to Dashboard

==================================================
SCREEN 11: SETTINGS
===================

Include:

* Avatar personalization
* Theme mode
* Learning mode
* Notification preferences

Save Settings button must work.

==================================================
SCREEN 12: LOGOUT
=================

When clicking Logout:

Show confirmation popup:

"Are you sure you want to logout?"

Buttons:

* Cancel
* Logout

Avatar says:

"See you next time!"

Logout returns to Login.

==================================================
ADMIN PANEL
===========

ADMIN PANEL MUST ONLY BE VISIBLE TO AUTHORIZED ADMIN EMAILS.

IF non-admin tries to access admin:

Show access denied screen.

Message:

"Access Restricted. Administrator privileges required."

Avatar says:

"This area is reserved for system administrators."

Button:

Return to Dashboard.

AUTHORIZED ADMINS CAN ACCESS:

* User Management
* Uploaded File Logs
* Error Analytics
* User Activity
* Delete or Suspend User
* System Statistics

Display administrator badge beside profile:

"Administrator"

Use security and lock icons.

==================================================
PHASE 3 REQUIREMENTS
====================

This prototype must clearly demonstrate:

* Complete user workflow
* Beginner-friendly design
* Upload instructions based on real user testing
* Automatic error history linked to uploads
* Role-based admin access
* Secure navigation
* No dead buttons
* University presentation quality
* Suitable for Phase 3 prototype and data design assessment