mkdir -p .tmp_xpi_dir/

# Copy all of the files from the Chrome extension to the build directory.
rm -rf .tmp_xpi_dir/*
cp -r ../chrome/extension/* .tmp_xpi_dir/
cp -r extension/* .tmp_xpi_dir/

cd .tmp_xpi_dir

cat minify.js extension.js bootstrap.js bootstrap-lib.js > bootstrap.tmp.js && mv bootstrap.tmp.js bootstrap.js

# Remove any files we don't want to send to end users.
rm -rf `find ./ -name ".DS_Store"`
rm -rf `find ./ -name "Thumbs.db"`
rm -rf `find ./ -name ".svn"`
rm -rf `find ./ -name ".git"`

rm -rf background.html background.js comment-snob.js content.js lib/ manifest.json minify.json.js options.html skin/chrome-preferences-page.css skin/install.css
zip -rq ../extension.xpi *
cd ../
