import { DataSource } from "typeorm";
import { User } from "../../modules/user/entities/user.entity.js";
import { Event } from "../../modules/event/entities/event.entity.js";
import { Member } from "../../modules/member/entities/member.entity.js";
import { Transaction } from "../../modules/transaction/entities/transaction.entity.js";
import { ChekiPrice } from "../../modules/setting/entities/cheki-price.entity.js";
import { Listing } from "../../modules/listing/entities/listing.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOSTNAME || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "stellar_luna",
  synchronize: process.env.NODE_ENV === "development",
  logging: false,
  entities: [User, Event, Member, Transaction, ChekiPrice, Listing],
  subscribers: [],
  migrations: [],
});
