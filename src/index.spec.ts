import { BeforeEach, AfterEach, expect, Test, TestSuite } from 'testyts';
import { generateAccessKey, loadAccessKey, getKeyId, TokenGenerator } from './index';
import { Base64 } from 'js-base64';

const TestData = {
  accessKey: 'AcIbjUrHA8EV62TAGYcwDtHhQ8wN3lXmcKtFtN/SvdMA',
  keyId: 'AQ7aVmK+pI1l',
  publicKey: 'ZGYe/vBZVNkzQ6fD8BmkJUb6o0p8wfKt3PqFVx6+be4=',
  secretKey: 'whuNSscDwRXrZMAZhzAO0eFDzA3eVeZwq0W039K90wBkZh7+8FlU2TNDp8PwGaQlRvqjSnzB8q3c+oVXHr5t7g==',
};

const capturedDateNow = Date.now;

@TestSuite()
export class AccessKeyTestSuite {
  @BeforeEach()
  beforeEach() {
    Date.now = () => 32503680000000; // Wed Jan 01 3000 00:00:00 GMT+0000
  }

  @AfterEach()
  afterEach() {
    Date.now = capturedDateNow;
  }

  @Test()
  generateAccessKey() {
    const accessKey = generateAccessKey();
    expect.toBeEqual(accessKey.length, 44);
    expect.toBeTrue(Base64.isValid(accessKey));
  }

  @Test()
  loadAccessKey() {
    const { publicKey, secretKey } = loadAccessKey(TestData.accessKey);
    expect.toBeEqual(Base64.fromUint8Array(publicKey), TestData.publicKey);
    expect.toBeEqual(Base64.fromUint8Array(secretKey), TestData.secretKey);
  }

  @Test()
  getKeyId() {
    const publicKey = Base64.toUint8Array(TestData.publicKey);
    const keyId = getKeyId(publicKey);
    expect.toBeEqual(keyId, TestData.keyId);
  }

  @Test()
  generateToken() {
    const generator = new TokenGenerator(TestData.accessKey);
    const token = generator.createToken('test-room', 'test-user');
    expect.toBeEqual(
      token,
      'eyJhbGciOiJFZERTQSIsImtpZCI6IkFRN2FWbUsrcEkxbCJ9.eyJyaWQiOiJ0ZXN0LXJvb20iLCJ1aWQiOiJ0ZXN0LXVzZXIiLCJzdWIiOiJjb25uZWN0IiwiZXhwIjozMjUwMzY4MDMwMCwibmJmIjozMjUwMzY4MDAwMH0.HZHRcFZ-DsdTTWE0gqbG1ZAc1YFb81OiGGwB5MeD2zA87TOKzCCpsxPIfUF4XHBVx50xvZxEM3nsrzMBS1ScCA'
    );
  }
}
