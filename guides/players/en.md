## Who's on now {#online}

The **Online now** table on the **Players** page shows every player on your server right now: their name, player ID, when they joined, and how long they've played. We read it from the server log, so a player shows up a moment after they join.

@[open](panel:players)

Or type in the console:

@[command](players)

## The owner {#owner}

The owner is the player whose ID is in the **Owner's player ID** field of the **Settings** tab, and Dragonwilds doesn't start the server without it. The owner can ban and unban any player, online or not.

To hand the server to another player, put their player ID in the field and save. It applies at the next start. Each player finds their ID at the bottom of the **Settings** menu in the game.

@[open](panel:settings)

## Admins {#admins}

An admin can ban regular players while they're online, and can't unban anyone. A player becomes an admin in one of two ways:

- **The admin password**: the player types it in the game, as in the steps below. We generated it when your server was installed, and you'll find it in the **Admin password** field of the **Settings** tab. Share it only with people you trust.
- **The admins list**: add the player's ID to the **Admins** table on the **Players** page, and they're an admin without typing the password. Your server reads the list when it starts, so a change made while it runs applies at the next start.

To take admin away, remove the player from the **Admins** table, change the admin password, then restart your server. A player who typed the password stays an admin until it changes.

## Kick and ban in the game {#ban}

Kicking and banning happen inside Dragonwilds, not in the panel:

1. Open the pause menu, then **Settings**
2. Open **Server Management** and type the admin password
3. Pick the player, then kick or ban them

- The owner bans and unbans anyone, online or not
- An admin bans regular players who are online, and can't unban
- Only the owner can unban a player

## No whitelist {#no-whitelist}

Dragonwilds has no whitelist. The world password keeps out everyone who doesn't have it, and you set it in the **World password** field of the **Settings** tab. To keep out a player who knows it, ban them in the game, or change the password and restart your server, then send the new one only to the friends you want.
