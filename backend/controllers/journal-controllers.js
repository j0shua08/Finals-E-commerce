const { v7: uuid } = require("uuid");
const { validationResult } = require("express-validator");

const getCoordsForAddress = require("../util/geocode");
const Journal = require("../models/journal");
const HttpError = require("../models/http-error");

const getEntryById = async (req, res, next) => {
  const entryId = req.params.pid;
  console.log("[JOURNAL] getEntryById called with pid:", entryId);

  let entry;
  try {
    entry = await Journal.findById(entryId);
    console.log("[JOURNAL] getEntryById DB result:", entry);
  } catch (err) {
    console.error("[JOURNAL] getEntryById error:", err);
    const error = new HttpError(
      "Something went wrong, could not find an entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    const error = new HttpError(
      "Could not find an entry for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ entry: entry.toObject({ getters: true }) });
};

const getEntriesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  console.log("[JOURNAL] getEntriesByUserId called with uid:", userId);

  let entries;
  try {
    // ✅ Use the correct field to filter user entries
    entries = await Journal.find({ author: userId });
    console.log("[JOURNAL] DB result for user:", userId, "=>", entries);
  } catch (err) {
    console.error("[JOURNAL] getEntriesByUserId error:", err);
    const error = new HttpError(
      "Fetching entries failed, please try again later",
      500
    );
    return next(error);
  }

  if (!entries || entries.length === 0) {
    console.log("[JOURNAL] No entries found for user:", userId);
    // It's okay to return an empty array here ONLY when there are truly no entries
    return res.json({ entries: [] });
  }

  console.log(
    "[JOURNAL] Returning",
    entries.length,
    "entries for user:",
    userId
  );

  res.json({
    entries: entries.map((entry) => entry.toObject({ getters: true })),
  });
};

const createEntry = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[JOURNAL] createEntry validation errors:", errors.array());
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { headline, journalText, locationName, author } = req.body;
  console.log("[JOURNAL] createEntry request body:", req.body);

  let coordinates;

  try {
    coordinates = await getCoordsForAddress(locationName);
    console.log("[JOURNAL] Geocoded coordinates:", coordinates);
  } catch (error) {
    console.error("[JOURNAL] Geocoding failed:", error);
    return next(error);
  }

  const createdEntry = new Journal({
    id: uuid(),
    headline,
    journalText,
    photo:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpPkm3Hhfm2fa7zZFgK0HQrD8yvwSBmnm_Gw&s",
    locationName,
    coordinates: {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    },
    author, // should match the userId used in getEntriesByUserId
  });

  try {
    await createdEntry.save();
    console.log("[JOURNAL] Entry created:", createdEntry);
  } catch (err) {
    console.error("[JOURNAL] Creating entry failed:", err);
    const error = new HttpError(
      "Creating entry failed, please try again",
      500
    );
    return next(error);
  }

  res.status(201).json({ entry: createdEntry });
};

const updateEntry = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[JOURNAL] updateEntry validation errors:", errors.array());
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { headline, journalText } = req.body;
  const entryId = req.params.pid;
  console.log("[JOURNAL] updateEntry called with pid:", entryId);
  console.log("[JOURNAL] updateEntry payload:", { headline, journalText });

  let entry;
  try {
    entry = await Journal.findById(entryId);
    console.log("[JOURNAL] updateEntry DB result:", entry);
  } catch (err) {
    console.error("[JOURNAL] updateEntry findById error:", err);
    const error = new HttpError(
      "Something went wrong, could not update entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    const error = new HttpError(
      "Could not find an entry for the provided id.",
      404
    );
    return next(error);
  }

  entry.headline = headline;
  entry.journalText = journalText;

  try {
    await entry.save();
    console.log("[JOURNAL] Entry updated:", entry);
  } catch (err) {
    console.error("[JOURNAL] updateEntry save error:", err);
    const error = new HttpError(
      "Something went wrong, could not update entry.",
      500
    );
    return next(error);
  }

  res.status(200).json({ entry: entry.toObject({ getters: true }) });
};

const deleteEntry = async (req, res, next) => {
  const entryId = req.params.pid;
  console.log("[JOURNAL] deleteEntry called with pid:", entryId);

  let entry;
  try {
    entry = await Journal.findById(entryId);
    console.log("[JOURNAL] deleteEntry DB result:", entry);
  } catch (err) {
    console.error("[JOURNAL] deleteEntry findById error:", err);
    const error = new HttpError(
      "Something went wrong, could not delete entry.",
      500
    );
    return next(error);
  }

  if (!entry) {
    return next(new HttpError("Could not find entry for this id.", 404));
  }

  try {
    await entry.deleteOne();
    console.log("[JOURNAL] Entry deleted:", entryId);
  } catch (err) {
    console.error("[JOURNAL] deleteEntry deleteOne error:", err);
    const error = new HttpError(
      "Something went wrong, could not delete entry.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted entry." });
};

exports.getEntryById = getEntryById;
exports.getEntriesByUserId = getEntriesByUserId;
exports.createEntry = createEntry;
exports.updateEntry = updateEntry;
exports.deleteEntry = deleteEntry;