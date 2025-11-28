const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true },

  // Keep this for backwards compatibility (UsersList, etc.)
  name: { type: String, required: true },

  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  image: {
    type: String,
    default:
      "https://img.freepik.com/free-...user-circles-set_78370-4704.jpg?semt=ais_incoming&w=740&q=80",
  },
  places: [{ type: Schema.Types.ObjectId, ref: "Place" }],
});

module.exports = mongoose.model("User", userSchema);