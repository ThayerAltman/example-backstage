# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

To start the app, run:

```sh
yarn install
yarn dev
```
# Initial Backstage Setup
## Commit: [Create Repo](https://github.com/ThayerAltman/example-backstage/commit/64f470394c5ec8022af05d47247db0723e69bbd4)
This repo was created by following the [Backstage installation](https://backstage.spotify.com/learn/standing-up-backstage/standing-up-backstage/2-install-app/) instructions

## Commit: [Configuration](https://github.com/ThayerAltman/example-backstage/commit/64f470394c5ec8022af05d47247db0723e69bbd4)
This commit consists of following instructions from [Setting up PostgreSQL](https://backstage.spotify.com/learn/standing-up-backstage/configuring-backstage/5-config-2/) to [Setting up Authentication](https://backstage.spotify.com/learn/standing-up-backstage/configuring-backstage/7-authentication/)
To run the application, an app-config.local.yaml will need to be added.  It will something look like:
```yaml
backend:
  database:
    connection:
      host: localhost
      # Default postgresql port is 5432.  50576 is arbitrary, 5432 is in use by a another application.
      port: 50576
      user: postgres
      # Replace the password below with your postgresql password:
      password: <secret>
auth:
  # see https://backstage.io/docs/auth/ to learn about auth providers
  environment: development
  providers:
    github:
      development:
        clientId: <client_id>
        clientSecret: <secret_key>
integrations:
  github:
    - host: github.com
      token: <github_token>
```
1. <client_id> and <secret_key> are created [here](https://backstage.spotify.com/learn/standing-up-backstage/configuring-backstage/7-authentication/)

2. <github_token> is created [here](https://backstage.spotify.com/learn/standing-up-backstage/putting-backstage-into-action/8-integration/)

# SoundCheck Install
Add the Spotify license key to you app-config-local.yaml
```yaml
spotify:
  licenseKey: <license_key>
```
The <license_key> can be found by going to [Backstage Account Overview](https://backstage.spotify.com/account/)

## Commit: [Soundcheck Installtion and Setup](https://github.com/ThayerAltman/example-backstage/commit/b145d6aacd51fb00189dfd542d8b0eb41e8fbc97)
This commit consists of following the Soundcheck installation instructions:
1. [Backend Installation](https://www.npmjs.com/package/@spotify/backstage-plugin-soundcheck-backend#1-install-the-plugins)
2. [Frontend Installation](https://www.npmjs.com/package/@spotify/backstage-plugin-soundcheck)

At this point Soundcheck is installed.  But it is not doing anything.  The menu bar on the left should be visible:

![](./pictures/side-bar.png)

As well as the tab menu when viewing an entity:

![](./pictures/tab-menu.png)