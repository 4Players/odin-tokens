import {
  generateAccessKey,
  getKeyId,
  loadAccessKey,
  TokenGenerator,
} from "./mod.ts";
import { decodeBase64, encodeBase64 } from "@std/encoding";
import { assertEquals } from "jsr:@std/assert";
import { FakeTime } from "jsr:@std/testing/time";

const TestData = {
  accessKey: "AcIbjUrHA8EV62TAGYcwDtHhQ8wN3lXmcKtFtN/SvdMA",
  keyId: "AQ7aVmK+pI1l",
  publicKey: "ZGYe/vBZVNkzQ6fD8BmkJUb6o0p8wfKt3PqFVx6+be4=",
  secretKey: "whuNSscDwRXrZMAZhzAO0eFDzA3eVeZwq0W039K90wA=",
};

const _time = new FakeTime(32503680000000);

Deno.test("generateAccessKey", () => {
  const accessKey = generateAccessKey();
  assertEquals(accessKey.length, 44);
  decodeBase64(accessKey);
});

Deno.test("loadAccessKey", async () => {
  const secretKey = await loadAccessKey(TestData.accessKey);
  assertEquals(encodeBase64(secretKey), TestData.secretKey);
});

Deno.test("getKeyId", async () => {
  const secretKey = decodeBase64(TestData.secretKey);
  const keyId = await getKeyId(secretKey);
  assertEquals(keyId, TestData.keyId);
});

Deno.test("generateToken", async () => {
  const generator = new TokenGenerator(TestData.accessKey);
  const token = await generator.createToken("test-room", "test-user");
  assertEquals(
    token,
    "eyJhbGciOiJFZERTQSIsImtpZCI6IkFRN2FWbUsrcEkxbCJ9.eyJyaWQiOiJ0ZXN0LXJvb20iLCJ1aWQiOiJ0ZXN0LXVzZXIiLCJzdWIiOiJjb25uZWN0IiwiZXhwIjozMjUwMzY4MDMwMCwibmJmIjozMjUwMzY4MDAwMH0.HZHRcFZ-DsdTTWE0gqbG1ZAc1YFb81OiGGwB5MeD2zA87TOKzCCpsxPIfUF4XHBVx50xvZxEM3nsrzMBS1ScCA",
  );
});

Deno.test("generateMultiRoomToken", async () => {
  const generator = new TokenGenerator(TestData.accessKey);
  const token = await generator.createToken(
    ["test-room1", "test-room2"],
    "test-user",
  );
  assertEquals(
    token,
    "eyJhbGciOiJFZERTQSIsImtpZCI6IkFRN2FWbUsrcEkxbCJ9.eyJyaWQiOlsidGVzdC1yb29tMSIsInRlc3Qtcm9vbTIiXSwidWlkIjoidGVzdC11c2VyIiwic3ViIjoiY29ubmVjdCIsImV4cCI6MzI1MDM2ODAzMDAsIm5iZiI6MzI1MDM2ODAwMDB9.j4wtRREurbbzTlShx6Inc_H6bAyj8omSZ3Tcj59s0jQk83TOQiM59GEIsCobs-nGSz-PkHlFJB-TIS8_j1rLBQ",
  );
});

Deno.test("generateSingleServerToken", async () => {
  const generator = new TokenGenerator(TestData.accessKey);
  const token = await generator.createToken("test-room", "test-user", {
    audience: "sfu",
  });
  assertEquals(
    token,
    "eyJhbGciOiJFZERTQSIsImtpZCI6IkFRN2FWbUsrcEkxbCJ9.eyJyaWQiOiJ0ZXN0LXJvb20iLCJ1aWQiOiJ0ZXN0LXVzZXIiLCJzdWIiOiJjb25uZWN0IiwiYXVkIjoic2Z1IiwiZXhwIjozMjUwMzY4MDMwMCwibmJmIjozMjUwMzY4MDAwMH0.Lj8BCFLUeH9aAV9SY-JUpNllGahN2gjSIMgepfCV2SyHAkZn7bdDxQeV_bOVWmzZN9zds6nOSbDqdJAECHbaCg",
  );
});
