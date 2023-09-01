# Steam Marketing Data Automation Tool

This tool automates the downloading of your Steam game's marketing data and appends it to a Google Sheet. It uses Node.js, Puppeteer, and other libraries to get the job done.

**Disclaimer**: This script is currently in a developmental state. It works but may lack sufficient error handling. Use at your own risk.

## Requirements

- Node.js
- Puppeteer
- node-fetch
- MicroCommander

## Installation

1. Clone the repository:

    ```
    git clone <repository_url>
    ```

2. Navigate to the project directory and install the required packages:

    ```
    cd <directory_name>
    npm install
    ```

3. Create a `.env` file and fill out the following fields:

    ```
    TABLE_ID=<your_table_id>
    GOOGLE_AUTH_PATH=<path_to_your_google_auth.json>
    EMAIL_HOST=<email_host>
    EMAIL_USER=<email_user>
    EMAIL_PASS=<email_password>
    STEAM_USER=<steam_username>
    STEAM_PASS=<steam_password>
    ```

4. Create a `config.json` file with the following content:

    ```json
    {
      "crons": {
        "get_stats": {
          "cron": "0 8 * * *"
        }
      },
      "switches": {
        "get_stats_switch": true
      }
    }
    ```

## Usage

### Manual Run

To manually test the script, navigate to `steam_csv.js` and uncomment the test run at the end of the file. Then run:

```bash
node steam_csv.js
```

### Automated Run

For automated runs, make sure the cron configuration in your `config.json` is set up, then run:

```bash
node index.js
```

## Important Security Notes

- **Create a dedicated Steam account with read-only access to your marketing data.** This minimizes security risks associated with using your main account.

## Contributing and Support

If you encounter any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
