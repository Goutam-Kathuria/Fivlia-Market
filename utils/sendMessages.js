const axios = require("axios");
const SettingAdmin  = require("../modals/setting");

const sendMessages = async (phoneNumber, message, templateId = "") => {
  if (!phoneNumber || !message) {
    throw new Error("Missing phone number or message.");
  }

  const setting = await SettingAdmin.findOne().lean();
  if (!setting) throw new Error("Missing Auth settings in database.");

  try {
      let formattedNumber = phoneNumber;
      if (phoneNumber.startsWith("+91")) {
        formattedNumber = phoneNumber.slice(3);
      }
      const response = await axios.get(
        "https://www.bulksmsplans.com/api/send_sms",
        {
          params: {
            api_id: setting?.api_id,
            api_password: setting?.api_password,
            sms_type: "Transactional",
            sms_encoding: "1",
            sender: "FEVLIA",
            number: formattedNumber,
            message: message,
            template_id: templateId,
          },
          timeout: 10000,
        }
      );
      return {
        service: "BulkSMSPlans",
        success: response.data.code === 200,
        raw: response.data,
      };

  } catch (error) {
    console.error("Message Send Error:", error.message);
    throw error;
  }
};

module.exports = { sendMessages };
