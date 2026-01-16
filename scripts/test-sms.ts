import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

async function testSms() {
  const phoneNumber = process.argv[2] || process.env.TEST_PHONE_NUMBER;

  if (!phoneNumber) {
    console.error("❌ Error: Phone number is required");
    console.log("");
    console.log("Usage:");
    console.log("  pnpm test:sms +447911123456");
    console.log("  or set TEST_PHONE_NUMBER in .env file");
    console.log("");
    console.log("Phone number should be in E.164 format (e.g., +447911123456)");
    process.exit(1);
  }

  if (!phoneNumber.startsWith("+")) {
    console.error(
      "❌ Error: Phone number must be in E.164 format (start with +)"
    );
    console.log("Example: +447911123456");
    process.exit(1);
  }

  const apiKey = process.env.CLICK_SEND_API_KEY;
  const username = process.env.CLICK_SEND_USERNAME || apiKey;

  if (!apiKey) {
    console.error("❌ Error: CLICK_SEND_API_KEY is not set in .env file");
    console.log("");
    console.log("Please add CLICK_SEND_API_KEY to your .env file");
    console.log(
      "Optionally, also add CLICK_SEND_USERNAME if different from API key"
    );
    process.exit(1);
  }

  console.log("📱 Testing SMS functionality...");
  console.log(`📞 Phone number: ${phoneNumber}`);
  console.log("");

  const testMessage = `🎉 Test SMS from Jellycat Stock Alerts!

This is a test message to verify your ClickSend SMS integration is working correctly.

Timestamp: ${new Date().toISOString()}`;

  try {
    console.log("📤 Sending test SMS...");
    console.log(
      `   Using username: ${
        username === apiKey ? "(same as API key)" : username
      }`
    );

    const authString = Buffer.from(`${username}:${apiKey}`).toString("base64");

    const response = await fetch("https://rest.clicksend.com/v3/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        messages: [
          {
            source: "sdk",
            body: testMessage,
            to: phoneNumber,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ClickSend API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    if (data.response_code !== "SUCCESS") {
      throw new Error(
        `ClickSend API error: ${data.response_msg || "Unknown error"}`
      );
    }

    console.log("✅ SMS sent successfully!");
    console.log("");
    console.log("Response:", JSON.stringify(data, null, 2));
    console.log("");
    console.log("Check your phone for the test message.");
  } catch (error) {
    console.error("❌ Failed to send SMS:");

    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);

      if (error.message.includes("ClickSend API error")) {
        console.log("");
        console.log("💡 Authentication tips:");
        console.log("   - Make sure CLICK_SEND_API_KEY is set correctly");
        console.log(
          "   - If you have a separate username, set CLICK_SEND_USERNAME"
        );
        console.log(
          "   - Check your ClickSend dashboard for your username and API key"
        );
        console.log("   - Verify your account has sufficient credits");
      }
    } else {
      console.error("   Unknown error:", error);
    }

    process.exit(1);
  }
}

testSms();
