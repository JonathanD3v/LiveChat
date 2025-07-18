const { PhoneNumberUtil } = require("google-libphonenumber");

const checkMyanmarPhoneNumber = (phone) => {
  const phoneUtil = PhoneNumberUtil.getInstance();
  try {
    const number = phoneUtil.parse(phone, "MM");
    return phoneUtil.isValidNumber(number);
  } catch (error) {
    return false;
  }
};

module.exports = checkMyanmarPhoneNumber;
