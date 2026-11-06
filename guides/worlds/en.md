## Worlds in Dragonwilds {#how}

Every Dragonwilds world is one `.sav` file, and the file's name without `.sav` is the world's name. Your server can hold several worlds, and at every start it loads the one named in the **World name** field of the **Settings** tab. Every world is in the table of the **World** tab, with the active one marked.

@[open](panel:world)

If no world has that name yet, the server creates a **Standard** world with it as it starts.

A world name is at most 16 characters, and capital and small letters in it are different. Players search for your server by this same name.

> [!warning] Never rename a `.sav` file. If Dragonwilds starts on a renamed file, the world's progress is lost. If you renamed one, give it back its original name before you start your server.

## World type and difficulty {#type}

Dragonwilds sets the world type, the difficulty and every world setting when the world is created in the game, and saves them inside the `.sav` file. The server has no setting for them, and the world your server creates on its own is always **Standard**. For a **Custom** or **Creative** world, create it in Dragonwilds on your PC, then upload it.

## Upload a world from your PC {#upload}

The worlds you play on your PC are in:

```txt
%localappdata%\RSDragonwilds\Saved\SaveGames
```

1. If the world is new, enter it in Dragonwilds and wait 1 to 2 minutes, so the area around you loads completely
2. Leave the world: press Esc, then **Exit Game**
3. Stop your server, because a world can't be uploaded while it runs
4. Press **Upload world** in the **World** tab and pick the world's `.sav` file from the folder above. Its name without `.sav` must be 16 characters or fewer, with no space at its start or end
5. Once the world appears in the table, press **Activate** on its row. This sets the world name to the file's name for you
6. Start your server

## Switch between worlds {#switch}

Every world in the table has an **Activate** button. It sets the world name in the **Settings** tab to that world's name, and your server loads it at the next start. If your server is running, restart it to switch. The old world stays in the table, so activate it again whenever you like.

## Create a new world {#new}

Press **Create world** and type its name: up to 16 characters, with no space at its start or end, and no `/`, `\` or two dots in a row. The name becomes the world name, and at the next start Dragonwilds creates a new **Standard** world with it. If your server is running, restart it to create the world. Your current world stays in the table, and **Activate** brings it back.

## Delete a world {#delete}

Press **Delete** on the world's row, and the world is gone for good. We don't take a backup before the delete, so take one first if you might want the world back. The active world can't be deleted, so activate another one first. If your server is running, we stop it and start it again for you.

## Download a world {#download}

Press **Download** on a world's row to get its `.sav` file, for your PC or another server. Keep its name as it is.

## Backups {#backups}

A stop or a restart writes nothing to the world, and it keeps what the game last saved. Your server's backups hold every world in the table, with your settings and mods. We take one automatically before every game update. Restore one from the **Backups** page.

@[open](backups)
