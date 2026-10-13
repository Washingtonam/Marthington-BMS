import test from "node:test";
import assert from "node:assert/strict";
import { filterCampaignRecipients } from "../src/jobs/emailCampaign.job.js";

const recipients = [
  { email: "ada@example.com" },
  { email: "lee@example.com" },
  { email: "" }
];

test("campaigns without an explicit recipient selection use the full eligible audience", () => {
  assert.deepEqual(filterCampaignRecipients(recipients, null), recipients);
});

test("campaigns send only to selected email addresses", () => {
  assert.deepEqual(
    filterCampaignRecipients(recipients, ["LEE@example.com"]),
    [{ email: "lee@example.com" }]
  );
});
