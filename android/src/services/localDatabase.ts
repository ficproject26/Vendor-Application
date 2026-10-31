// DEPRECATED: Local database has been removed and replaced by MongoDB Atlas (mongoDatabase.ts).
import { mongoDB, MongoOrder, MongoCustomer } from './mongoDatabase';

export type LocalOrder = MongoOrder;
export type LocalCustomer = MongoCustomer;
export const localDB = mongoDB;
