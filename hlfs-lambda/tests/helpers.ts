import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../src/app";
import { User } from "hlfs-mongo";

export async function startMemoryMongo() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  return mongo;
}

export async function stopMemoryMongo(mongo: MongoMemoryServer) {
  await mongoose.disconnect();
  await mongo.stop();
}

export async function createAdmin(email = "admin@homelife.local", password = "change-me-now") {
  const passwordHash = await bcrypt.hash(password, 8);
  return User.create({ email, passwordHash, role: "admin" });
}

export function app() {
  return createApp();
}

export async function loginAgent(email = "admin@homelife.local", password = "change-me-now") {
  const agent = request.agent(app());
  await agent.post("/api/auth/login").send({ email, password }).expect(200);
  return agent;
}

export const cityCsv = `Cities,Municipal status,Geographic area
Toronto,Single Tier,Toronto
Mississauga,Lower Tier,Peel
Vaughan,Lower Tier,York
Hamilton,Single Tier,Hamilton
Hamilton,Lower Tier,Northumberland
Ingersoll,Lower Tier,Oxford
Greater Sudbury,Single Tier,Sudbury
York,Upper Tier,York
Ajax,Lower Tier,Durham
`;

export const sampleRecoCsv = `legal_name,registration_category,registration_number,registration_status,registration_expiry,broker_of_record,brokerage_address,brokerage_email,brokerage_phone,conditions_and_discipline_history,corporation_url,employee_list_url,search_city,scraped_at
HomeLife Sample Realty Inc.,Brokerage,H100,REGISTERED,2027/01/01,Jane Broker,"100 Queen St Toronto, ON M5H 2N2 Canada",home@example.com,416-555-0100,None,https://example.com/corp,https://example.com/staff,Toronto,2026-09-10T18:45:19+00:00
Royal LePage Sample Inc.,Brokerage,R200,REGISTERED,2027/02/01,John Broker,"200 Queen St Toronto, ON M5H 2N2 Canada",royal@example.com,416-555-0200,None,https://example.com/royal,https://example.com/royal-staff,Toronto,2026-09-10T18:45:19+00:00
Suspended Desk Ltd.,Brokerage,S300,SUSPENDED,2024/01/01,Pat Broker,"1 King St Ajax, ON L1S 1A1 Canada",suspend@example.com,905-555-0300,Discipline history,https://example.com/s,https://example.com/s-staff,Ajax,2026-09-10T18:45:19+00:00
`;

export function sampleOffices() {
  return [
    {
      id: "1",
      slug: "homelife-toronto",
      name: "HomeLife Toronto",
      brokerageGroup: "HomeLife Toronto",
      city: "Etobicoke",
      province: "Ontario",
      address: "100 Queen St, Toronto",
      phone: "416-555-0100",
      email: "toronto@example.com",
      website: "www.example.com",
      socials: [],
      aboutParagraphs: [],
      listedOnCorporateWebsite: true,
      lat: 43.65,
      lng: -79.38,
    },
    {
      id: "2",
      slug: "homelife-vaughan",
      name: "HomeLife Vaughan",
      brokerageGroup: "HomeLife Achievers",
      city: "Vaughn",
      province: "Ontario",
      address: "1 Woodbridge Ave, Vaughan",
      lat: 43.78,
      lng: -79.59,
    },
    {
      id: "3",
      slug: "homelife-calgary",
      name: "HomeLife Calgary",
      brokerageGroup: "HomeLife Calgary",
      city: "Calgary",
      province: "Alberta",
      address: "12 8 Ave SW, Calgary",
      lat: 51.04,
      lng: -114.07,
    },
  ];
}
