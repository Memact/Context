export const category = "food-delivery";

export const contextFields = {
  restaurant_name: "Name of the restaurant or food outlet",
  items_ordered: "List of food items ordered",
  cuisine_type: "Type of cuisine (e.g. Indian, Chinese, Italian)",
  order_total: "Total price of the order",
  delivery_time: "Estimated or actual delivery time in minutes",
  platform: "App used for ordering (e.g. Swiggy, Zomato, Uber Eats)",
  order_type: "Delivery or pickup",
  occasion: "Reason for order if known (e.g. late night, lunch, party)",
  shared_order: "Whether the order was shared with others",
};

export const rawInputExamples = [
  {
    source: "swiggy.com",
    items: ["Butter Chicken", "Naan", "Gulab Jamun"],
    restaurant: "Punjabi Tadka",
    total: 450,
    delivery_minutes: 35,
  },
  {
    source: "zomato.com",
    items: ["Margherita Pizza"],
    restaurant: "Pizza Hut",
    total: 299,
    delivery_minutes: 45,
  },
  {
    source: "zomato.com",
    items: ["Biryani"],
    restaurant: "Bawarchi",
    total: 180,
    delivery_minutes: 30,
    note: "ordered for office team",
  },
];

export const normalizedOutputExamples = [
  {
    category: "food-delivery",
    restaurant_name: "Punjabi Tadka",
    cuisine_type: "Indian",
    items_ordered: ["Butter Chicken", "Naan", "Gulab Jamun"],
    order_total: 450,
    delivery_time: 35,
    platform: "swiggy.com",
    shared_order: false,
    occasion: "unknown",
  },
  {
    category: "food-delivery",
    restaurant_name: "Pizza Hut",
    cuisine_type: "Italian",
    items_ordered: ["Margherita Pizza"],
    order_total: 299,
    delivery_time: 45,
    platform: "zomato.com",
    shared_order: false,
    occasion: "unknown",
  },
  {
    category: "food-delivery",
    restaurant_name: "Bawarchi",
    cuisine_type: "Indian",
    items_ordered: ["Biryani"],
    order_total: 180,
    delivery_time: 30,
    platform: "zomato.com",
    shared_order: true,
    occasion: "office",
  },
];

export const wikiEntryTemplates = [
  "Ordered {{items_ordered}} from {{restaurant_name}} via {{platform}}.",
  "Had {{cuisine_type}} food delivered in {{delivery_time}} minutes.",
  "Placed a food order totalling {{order_total}} from {{restaurant_name}}.",
];

export const permissionSuggestions = {
  restaurant_name: "low",
  items_ordered: "medium",
  order_total: "high",
  delivery_time: "low",
  platform: "low",
  shared_order: "medium",
  occasion: "medium",
};

export const careNotes = [
  "Do not treat a single order as a stable food preference.",
  "Shared orders should not be attributed to one user's taste.",
  "Temporary cravings and one-off orders must not build long-term preferences.",
  "Avoid inferring dietary restrictions from a single data point.",
  "late night orders may be situational, not habitual.",
];
