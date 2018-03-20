let fs = require('fs'),
    path = require('path'),
    eol = require('os').EOL;

module.exports.run = function (config) {

  if (typeof config === 'undefined') {
      throw new Error('You must define a minimum config e.g. one containing base_directory and license');
  }

  let base_directory = config.folder;
      license = config.license; // THE TEXT TO GO IN THE LICENSE AND GET FORMATTED
      exclude_defaults = true;
      exclude_exact_paths = config.exact_paths_method === 'EXCLUDE' ? true : false;
      exact_paths = typeof config.exact_paths !== 'undefined' ? config.exact_paths : [];
      exclude_file_type = config.file_type_method === 'EXCLUDE' ? true : false;
      file_types = typeof config.file_types !== 'undefined' ? config.file_types : [];
      insert_license = config.insert_license === true ? true : false;
  
  let default_ignore_extensions = [".png", ".svg", ".jpeg", ".jpg", ".gif", ".tif", ".ico", ".json"]

  if(config.hasOwnProperty('exclude_defaults')) {
    if(typeof config.exclude_defaults !== 'boolean') {
      throw new Error('exclude_defaults is not boolean')
    }
    exclude_defaults = config.exclude_defaults;
  }

  if(exclude_exact_paths) {
    console.log('Running using exclude exact_paths list');
  } else {
    console.log('Running using include exact_paths list');
  }

  if(exclude_file_type) {
    console.log('Running using exclude file type list');
  } else {
    console.log('Running using include file type list');
  }

  if(insert_license) {
    console.log('Automatically adding licenses');
  }

  let files = [];

  if(typeof base_directory === 'undefined') {
    throw new Error('No folder passed');
  } else if(typeof license === 'undefined') {
    throw new Error('No license passed');
  } else if(!(exact_paths instanceof Array)) {
    throw new Error('exact_paths is not an array')
  } else if(!(file_types instanceof Array)) {
    throw new Error('file_types is not an array')
  }

  base_directory = path.resolve(process.cwd(), base_directory);
  license = path.resolve(process.cwd(), license);

  exact_paths = exact_paths.map(function(el){
    return path.resolve(base_directory, el);
  });

  LicenseFormatter = require('./utils/license_formatter.js');
  LicenseFormatter = new LicenseFormatter(config.license_formats, config.default_format);

  function getFolderContent(folder) {
      fs.readdirSync(folder).forEach(item => {
        let pth = path.join(folder, item);
        if(fs.lstatSync(pth).isDirectory()) {
          if(exclude_exact_paths) {
            if(!exact_paths.includes(pth)) {
              getFolderContent(pth);
            }
          } else if (exact_paths.includes(pth)){
            // WE NEED TO ADD THE FILES IN THE SUBDIRECTORY TO THE INCLUDE LIST
            fs.readdirSync(pth).forEach(item => {
              exact_paths.push(path.join(pth, item));
            });
            getFolderContent(pth);
          }
        } else if(fs.lstatSync(pth).isFile()) {
          let push = false;
          if(exclude_exact_paths && !exact_paths.includes(pth)) {
            if(exclude_file_type) {
              if(!file_types.includes(path.extname(pth))) {
                  push = true;
              }
            } else if (file_types.includes(path.extname(pth))) {
                push = true;
            }
          } else if(!exclude_exact_paths && exact_paths.includes(pth)) {
            if(exclude_file_type) {
              if(!file_types.includes(path.extname(pth))) {
                  push = true;
              }
            } else if (file_types.includes(path.extname(pth))) {
                push = true;
            }
          }

          if (exclude_defaults) {
            if (default_ignore_extensions.includes(path.extname(pth))) {
              push = false;
            }
          }

          if (push) {
            files.push(pth)
          }
        }
      });
  }

  function giveFilesLicense() {
    let err = [];
    let license_text = fs.readFileSync(license).toString();
    for(let i = 0; i < files.length; i++) {
      let file = fs.readFileSync(files[i]).toString();
      let extension = path.extname(files[i]) ? path.extname(files[i]) : path.basename(files[i]);
      
      let formatted_text = LicenseFormatter.formatLicenseForFile(extension, license_text);

      if(file.substring(0, formatted_text.length) !== formatted_text) {
        if(insert_license) {
          let new_text = formatted_text + eol + file;
          fs.writeFileSync(files[i], new_text);
        } else {
          console.error('\x1b[31m\u2717\x1b[0m License not found in ', files[i]);
          err.push(files[i])
        }
      }
    }
    if(err.length > 0) {
      if(config.output) {
        console.log('OUTPUT', err.join(eol));
        fs.writeFileSync(path.resolve(process.cwd(), config.output), err.join(eol));
      }

      throw new Error('License Check failed. '+err.length+' file(s) did not have the license.');
    } else {
      console.log('\x1b[32m\u2714\x1b[0m All files have licenses.')
    }
  }

   getFolderContent(base_directory);
   giveFilesLicense()
  return true;
}