"use strict";
const axios = require("axios");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

const getEventBody = (event) => {
  try {
    if (typeof event.body === "string") {
      return JSON.parse(event.body);
    } else {
      return event.body;
    }
  } catch (jsonParseError) {
    console.log("Error while parsing event.body", jsonParseError.toString());
    return null;
  }
};

module.exports.processHook = async (event) => {
  const eventBody = getEventBody(event);

  let header = "";
  let errorMessage = "";
  switch (eventBody.state) {
    case "building":
      header = ":hammer: Build in progress";
      break;
    case "ready":
      header = ":rocket: Site deployed";
      break;
    case "error":
      header = ":x: Build failed";
      errorMessage = `\n\`Error Message\` ${eventBody.error_message}`;
      break;
    default:
      console.log("Default case hit");
      console.log(event);
      header = ":grey_question: Action not recognized";
      break;
  }
  const messageBody = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: header,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`Commit Message\` ${eventBody.title}\n\`URL\` ${eventBody.ssl_url}\n\`Commit URL\` ${eventBody.commit_url}\n\`Committer\`: ${eventBody.committer}${errorMessage}`,
        },
      },
    ],
  };
  try {
    const resp = await axios.post(process.env.SLACK_HOOK_URL, messageBody);
    console.log(resp);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Successfully sent message on slack channel",
      }),
    };
  } catch (err) {
    console.log(err.toString());
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Oops. Something went wrong." + err.toString(),
      }),
    };
  }

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

if (require.main === module) {
  const fs = require("fs");
  require("dotenv").config();
  const all = JSON.parse(fs.readFileSync("body.json"));
  (async () => {
    for await (const key of Object.keys(all)) {
      console.log(
        (await this.processHook({ body: JSON.stringify(all[key]) })).statusCode
      );
    }
  })();
}
