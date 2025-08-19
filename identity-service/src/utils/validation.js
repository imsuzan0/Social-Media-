import Joi from "joi";

const validateRegistration = (user) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    bio: Joi.string().max(100),
    profilePicture: Joi.string(),
  });
  return schema.validate(user);
};

export default validateRegistration;
