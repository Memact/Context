export const category = "events-concerts";

export const contextFields = {
  preferred_venues: "Preferred music venues or concert locations",
  ticket_price_range: "Typical ticket budget range for live shows",
  preferred_show_days: "Preferred calendar days for attending concerts",
};

export const rawInputExamples = [
  {
    source: "bookmyshow.com",
    venue: "Jawaharlal Nehru Stadium",
    ticket_price: 2500,
    show_day: "Saturday",
  },
  {
    source: "ticketmaster.com",
    venue: "Red Rocks Amphitheatre",
    ticket_price: 4500,
    show_day: "Friday",
  },
  {
    source: "bookmyshow.com",
    venue: "DY Patil Stadium",
    ticket_price: 1500,
    show_day: "Sunday",
  },
];

export const normalizedOutputExamples = [
  {
    category: "events-concerts",
    preferred_venues: ["Jawaharlal Nehru Stadium"],
    ticket_price_range: "2000-5000",
    preferred_show_days: ["Saturday"],
  },
  {
    category: "events-concerts",
    preferred_venues: ["Red Rocks Amphitheatre"],
    ticket_price_range: "2000-5000",
    preferred_show_days: ["Friday"],
  },
  {
    category: "events-concerts",
    preferred_venues: ["DY Patil Stadium"],
    ticket_price_range: "1000-2000",
    preferred_show_days: ["Sunday"],
  },
];

export const wikiEntryTemplates = [
  "Prefers attending concerts at {{preferred_venues}}.",
  "Usually purchases tickets in the {{ticket_price_range}} range.",
  "Often attends live shows on {{preferred_show_days}}.",
];

export const permissionSuggestions = {
  preferred_venues: "medium",
  ticket_price_range: "medium",
  preferred_show_days: "low",
};

export const careNotes = [
  "Do not treat a single concert booking as a long-term preference.",
  "Venue choices may depend on artist availability rather than venue loyalty.",
  "Ticket budgets can change over time and should not be treated as permanent.",
  "Preferred attendance days may reflect temporary schedules or availability.",
  "Concert attendance activity is not identity.",
];