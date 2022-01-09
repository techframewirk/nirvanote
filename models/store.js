const joi = require("joi");
const db = require("../utils/db");
const { UserAlreadyExistsError } = require("../utils/errors");

const collectionName = "stores";

const storeSchema = joi.object({
  name: joi.string().required(),
  storeName: joi.string().required(),
  mobile: joi
    .string()
    .regex(/^[0-9]{12}$/)
    .required(),
  location: joi.string().required(),
  preferredLanguage: joi.string().allow("kn", "en").required(),
});

const addStore = async (store) => {
  try {
    let validatedData = await storeSchema.validateAsync(store);
    let count = await db
      .getDB()
      .collection(collectionName)
      .countDocuments({ mobile: validatedData.mobile });
    if (count > 0) {
      throw new UserAlreadyExistsError(
        `User with mobile ${validatedData.mobile} already exists`
      );
    } else {
      let result = await db
        .getDB()
        .collection(collectionName)
        .insertOne(validatedData);
      return result.insertedId;
    }
  } catch (err) {
    throw err;
  }
};

const getAllStores = async () => {
  try {
    let result = await db.getDB().collection(collectionName).find().toArray();
    return result;
  } catch (err) {
    throw err;
  }
};

const getStoreUsingKeyAndValue = async (key, value) => {
  try {
    let result = await db
      .getDB()
      .collection(collectionName)
      .findOne({ [key]: value });
    return result;
  } catch (err) {
    throw err;
  }
};

const getStoresByLocation = async (lat, lon) => {
  try {
    let result = await db
      .getDB()
      .collection(collectionName)
      .aggregate([
        { $project: { lat_lon: { $split: ["$location", ", "] } } },
        {
          $addFields: {
            lat: { $first: "$lat_lon" },
            lon: { $arrayElemAt: ["$lat_lon", 1] },
          },
        },
        {
          $match: {
            lat: { $gt: lat.min.toString(), $lt: lat.max.toString() },
            lon: { $gt: lon.min.toString(), $lt: lon.max.toString() },
          },
        },
      ])
      .toArray();
    return result
  } catch (err) {
    throw err;
  }
};

module.exports = {
  addStore,
  getAllStores,
  getStoreUsingKeyAndValue,
  getStoresByLocation,
};
