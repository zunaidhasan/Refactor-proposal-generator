# 🚀 SardarIT Proposal Generator (Web App)

## 📖 Project Overview
The **SardarIT Proposal Generator** is a custom-built, AI-powered Web Application designed to automate and streamline the business development process for SardarIT. By leveraging the free Google Gemini 1.5 Flash API and a proprietary database of 566+ high-quality past projects, this tool instantly transforms raw client briefs into perfectly formatted, highly relevant, and professional project proposals.

**The Problem:** Writing custom proposals is time-consuming. Manually searching through past projects to find the most relevant portfolio links breaks focus and slows down response times.

**The Solution:** A lightweight web tool where the user simply pastes a client brief, clicks a button, and receives a complete proposal draft—automatically matched with the top 3 most relevant portfolio items and formatted using SardarIT's proven proposal templates.

## ✨ Key Features

- **AI-Powered Brief Analysis:** Utilizes Google Gemini 1.5 Flash to understand the core requirements, tech stack, and category of a client's brief.
- **Dynamic Portfolio Matching:** Semantically searches the 566-project database to find the top 3 most relevant past projects to include as portfolio proof.
- **Intelligent Template Selection:** Automatically categorizes the brief (WordPress, Full Stack, E-commerce, or Graphics/Design) and selects the corresponding agency template, ensuring consistent branding and messaging.
- **Zero-Cost Operation:** Built entirely on the free tier of the Google Gemini API—no OpenAI costs or monthly SaaS subscriptions required.
- **Data Privacy & Speed:** Runs completely client-side in the browser. The database is stored locally, and API calls are made directly from your browser, ensuring speed and privacy.
- **One-Click Copy:** Instantly copy the generated proposal to the clipboard for immediate pasting into Upwork, Fiverr, or email.

## ⚙️ Technical Architecture

The application is built using standard web technologies.

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **AI Engine:** Google Gemini 1.5 Flash API (`generativelanguage.googleapis.com`)
- **Database:** Local JSON array (converted from SardarIT's master CSV)
- **State Management:** LocalStorage API

### File Structure

```text
SardarIT-Extension/
│
├── index.html           # Main web interface (Input, Output, API key fields)
├── styles.css           # Clean, responsive styling
├── popup.js             # Core logic: API calls, DOM manipulation, prompt engineering
├── database.js          # JSON array of 566 SardarIT projects
└── icon.png             # Branding icon
```

## 🔄 How It Works (Workflow)

1. **Input:** The user opens `index.html` and pastes a client brief.
2. **Context Building:** The JavaScript constructs a mega-prompt containing:
   - The agency's 4 core proposal templates.
   - The condensed 566-project database.
   - The specific client brief.
3. **AI Processing:** The payload is sent to the Gemini 1.5 Flash API with a low temperature (0.3) to ensure strict adherence to the provided templates.
4. **Generation:** Gemini analyzes the brief, selects the correct template, extracts the client's specific needs, matches the top 3 portfolio URLs, and merges them into a cohesive proposal.
5. **Output:** The final text is rendered in the output textarea, stripped of unwanted markdown formatting, and ready to be copied.

## 🎯 Template Logic

The AI is strictly instructed to map the client's brief to one of four primary agency service categories:

1. **WordPress:** Triggered by keywords like WordPress, CMS, Elementor, redesign, blog, corporate.
2. **Full Stack:** Triggered by keywords like front-end & back-end, database, authentication, SaaS, dashboard, custom platform.
3. **E-commerce:** Triggered by keywords like Shopify, WooCommerce, selling products, digital downloads, cart, checkout.
4. **Graphics/Design:** Triggered by keywords like logo design, branding, visual identity, aesthetic.

## 🚀 Future Scope (Potential Upgrades)

- **Dynamic Pricing Calculator:** Add fields for the user to input hours/price, which the AI automatically weaves into the proposal template.
- **Cloud Sync Database:** Move `database.js` to Firebase or Supabase so the portfolio updates across devices automatically.
- **Tone Adjuster:** Further refine the tone adjuster dropdown to cover more advanced scenarios.
