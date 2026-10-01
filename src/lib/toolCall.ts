// The model cannot know live weather. With a tool, it asks your code.
// Without a tool, it can only guess.

export const QUESTION = "What is the weather in Lahore right now?";

export const CALL = 'get_weather({ "city": "Lahore" })';
export const RESULT = '{ "temp": 34, "unit": "C", "note": "sample reading" }';
export const ANSWER = "It is 34°C in Lahore right now.";
export const GUESS = "It might be around 20°C.";
