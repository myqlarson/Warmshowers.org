There are a number of things to do when setting  up a dev environment.

1. Turn on reroute_email and configure it
2. Run the change_user_emails.sh script here if you want to be absolutely sure no emails go out. Reroute_email is good enough if you remember it.
3. Run the clean_up_languages.sh AFTER changing the variables in the script. That will make your languages work and you not accidentally end up doing admin on warmshowers.org.
4. You may want to rsync files to your machine with something like
```
rsync -avz hardy1.thefays.us:/home/www/warmshowers.org/htdocs/files/ /path/to/mydev_site/files/ --exclude=imagecache --exclude=css --exclude=js --exclude=imagefield_thumbs
```
