-- Allow the same FCM device token to be registered for multiple users
-- (e.g. owner and client tested on one phone).
DROP INDEX IF EXISTS "PushToken_token_key";

CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");
