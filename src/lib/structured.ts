// With a schema, tokens that would break the JSON are dropped.
// Without one, the model is free to answer in a sentence.

export const QUESTION = "What is the capital of Pakistan, and which country is it in?";

export const SCHEMA = `{
  "city": string,
  "country": string
}`;

export type TokenTry = { token: string; ok: boolean; why: string };

export const GUIDED: TokenTry[] = [
  { token: "The", ok: false, why: "A sentence cannot start this JSON object." },
  { token: "{", ok: true, why: "An object has to open first." },
  { token: '"city"', ok: true, why: "The schema requires city." },
  { token: ":", ok: true, why: "A key is followed by a colon." },
  { token: '"Islamabad"', ok: true, why: "city is a string." },
  { token: ",", ok: true, why: "Another field follows." },
  { token: '"country"', ok: true, why: "The schema requires country." },
  { token: ":", ok: true, why: "A key is followed by a colon." },
  { token: '"Pakistan"', ok: true, why: "country is a string." },
  { token: "}", ok: true, why: "The object closes." },
];

export const FREE: TokenTry[] = [
  { token: "The", ok: true, why: "No schema, so a sentence is allowed." },
  { token: " capital", ok: true, why: "Still a sentence." },
  { token: " is", ok: true, why: "Still a sentence." },
  { token: " Islamabad", ok: true, why: "The fact is in the words, not in fields." },
  { token: ".", ok: true, why: "Valid prose. Not valid JSON." },
];

export const JSON_RESULT = '{ "city": "Islamabad", "country": "Pakistan" }';
export const PROSE_RESULT = "The capital is Islamabad.";
