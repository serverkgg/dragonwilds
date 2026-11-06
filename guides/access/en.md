## Three ways to join {#modes}

- **World name**: the main way. Players search for your world name in the game's public world list.
- **Join code**: a new code your server gets at every start.
- **Direct address**: your server's IP and port.

You'll find all three on the **Overview** page.

@[open](overview)

> [!note] Steam invites don't bring a player to a dedicated server yet, so use one of the three ways.

## The world name {#world-name}

Players find your server by searching for its world name:

1. Open **Worlds** in Dragonwilds
2. Choose the **Public** tab
3. Type the world name in the search box, then pick your server

Capital and small letters in the world name are different, and it is at most 16 characters. Set it in the **World name** field of the **Settings** tab, and it applies at the next start. It is also the name of the world your server loads, so **Activate** in the **World** tab sets it to the world you pick, and **Create world** sets it to the new world's name. The steps are in the [worlds guide](/games/dragonwilds/guides/worlds).

@[open](panel:settings)

## The join code {#join-code}

Your server gets a new join code at every start, and the **Overview** page shows the current one while your server runs. The code is hidden, so copy it with the copy button beside it and send it to your friends. After every restart, send them the new code.

We don't show the code in the console, because everyone who opens your server's console reads it.

## The direct address {#direct}

:::when server.address
Your server's address:

@[field](server.address)

Players who connect directly type the IP and the port exactly as shown.
:::else
Your server has no address right now. The address appears here and on the **Access** page once your server is set up.

@[open](access)
:::

The **Access** page also lists a second port named Beacon. Dragonwilds uses it when players join, and players never type it.

## The world password {#password}

The world password is optional, and you set it in the **World password** field of the **Settings** tab. Leave it empty and anyone who finds your server can join. If you set one, Dragonwilds asks every player for it when they join, and it replaces any password saved inside the world. It applies at the next start.

@[open](panel:settings)

## Crossplay {#crossplay}

The **Platforms** field of the **Settings** tab decides who can join your server:

- **All platforms (crossplay)**: the default. Players on PC, PlayStation, Xbox and Nintendo Switch 2 join together.
- **PC only**, **PlayStation only**, **Xbox only** or **Nintendo only**: only players on that platform join.

> [!warning] A Dragonwilds update can reach PlayStation, Xbox and Nintendo Switch 2 days after it reaches Steam. We update your server after the update is out on Steam, so console players can't join until the update reaches their platform. The details are in the [updates guide](/games/dragonwilds/guides/updates).

## When your friends can't find your server {#cant-join}

1. Check that the server is running and that the world name shows on the **Overview** page.
2. Check that they typed the world name exactly, with the same capital and small letters.
3. Check that their game is on the same version as the server. The steps are in the [updates guide](/games/dragonwilds/guides/updates).
4. Check that the **Platforms** field lets their platform in.
5. If you uploaded the world from your PC, check that it is the active world in the **World** tab, and restart your server after activating it.
6. If searching by name still doesn't work, try the join code or the direct address.
