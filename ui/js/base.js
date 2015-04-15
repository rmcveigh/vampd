(function($){
  // We will save multiple sites into local storage
  var sites = JSON.parse(localStorage.getItem('vampd'));
  if (sites == null) {
    var sites = {}
  }
  // Set up a blank object.
  var site = {};

  /**
   * Counts the number of fields to clone.
   */
  function cloneCount(obj) {
    if ($(obj).length > 1) {
      return true;
    }
    return false;
  }

  /**
   * Function to validate form
   * @return true or false if not valid.
   */
  function validateForm() {
    var result = true;
    $('label.required + input[type="text"]').each(function() {
      if ($(this).val() == '') {
        $(this).prev().addClass('error');
        result = false;
      }
      else {
        $(this).prev().removeClass('error');
      }
    });
    return result;
  }

  /**
   * Returns JSON string
   */
  function createSite() {
    // Now we need to check values and start adding them to a json.
    var site_name = $('#site_name').val();
    site.name = site_name;
    site.description = 'This role was generated by the vampd generator';
    site.chef_type = 'role';
    site.json_class = 'Chef::Role';
    site.default_attributes = {};
    site.override_attributes = {
      drupal: {
        sites: {
        }
      }
    };
    single_site = site.override_attributes.drupal.sites;
    single_site[site_name] = {};
    single_site[site_name].active = true;
    single_site[site_name].deploy = {};
    // Add the actions
    var actions = [];
    $('#actions input').each(function(i){
      if ($(this).is(':checked')) {
        actions.push($(this).val());
      }
    });
    single_site[site_name].deploy.action = actions;
    // Check the docroot
    var docroot = '';
    var docroot_before = '';
    if ($('#docroot_bool').is(':checked')) {
      var docroot = $('#settings_docroot').val();
    }
    // Add the drupal Version
    single_site[site_name].drupal = {
      version: $('#drupal_version').val(),
    }
    // Add settings
    single_site[site_name].drupal.settings = {
      files: $('#settings_files').val(),
      settings: {
        default: {
          location: $('#settings_settings').val(),
        }
      }
    };
    if (docroot != '') {
      single_site[site_name].drupal.settings.docroot = docroot;
    }

    // Add the profile
    if ($('#action_install').is(':checked')) {
      var profile = $('#settings_profile').val();
      single_site[site_name].drupal.settings.profile = profile;
    }

    // Add the db file
    if ($('#action_import').is(':checked')) {
      var dbFile = $('#settings_db_file').val();
      single_site[site_name].drupal.settings.db_file = '/vagrant/' + dbFile;
    }

    // Add the repository
    if ($('#git_bool').is(':checked')) {
      var gitHost = $('#git_host').val();
      var gitRepo = $('#git_repo').val();
      var gitRev = $('#git_rev').val();
      single_site[site_name].repository = {
        host: gitHost,
        uri: gitRepo,
        revision: gitRev,
      };
      if ($('#git_remotes_bool').is(':checked')) {
        single_site[site_name].repository.remotes = {};
        $('.git-remote').each(function(i) {
          var name = $(this).find('input.name').val();
          var uri = $(this).find('input.uri').val();
          single_site[site_name].repository.remotes[name] = uri;
        });
      }
    }
    // Settings
    if ($('#settings_add_bool').is(':checked')) {
      $('.settings-addition').each(function(i) {
        var name = $(this).find('input.name').val();
        var uri = $(this).find('input.uri').val();
        single_site[site_name].drupal.settings.settings[name] = {
          location: uri
        }
      });
    }
    // Drush Make Settings
    if ($('#drush_make_bool').is(':checked')) {
      single_site[site_name].drush_make = {
        api: $('#drush_make_api').val(),
        files: {
          default: $('#drush_make_file_default').val(),
        },
        template: false,
      }
      if ($('#drush_make_template').is(':checked')) {
        single_site[site_name].drush_make.template = true;
      }
      if ($('#drush_make_file_bool').is(':checked')) {
        $('.drush-make-file').each(function(i) {
          var name = $(this).find('input.name').val();
          var uri = $(this).find('input.uri').val();
          single_site[site_name].drush_make.files[name] = uri;
        });
      }
    }
    return site;
  }

  /**
   * Function to create JSON File for download.
   */
  var jsonFile = null;
  function makeJsonFile(json) {
    var data = new Blob([json], {type: 'text/json'});
    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (jsonFile !== null) {
      window.URL.revokeObjectURL(jsonFile);
    }
    jsonFile = window.URL.createObjectURL(data);
    return jsonFile;
  }

  /**
   * Function to clear the form through refreshing the page
   */
  function clearForm() {
    document.location.reload(true);
  }

  /**
   * Clear the localstored previous projects.
   */
  function clearPreviousSites() {
    var sites = {}
    localStorage.setItem('vampd', JSON.stringify(sites));
  }

  /**
   * Update the form with the preselected values
   */
  function updateForm(site) {
    $('#site_name').val(site.name);
    $.each(site.override_attributes.drupal.sites, function(i) {
      // Loop through the actions and set the form with the defined actions.
      $('#actions input').prop('checked', false);
      $.each(this.deploy.action, function(i) {
        var action = this.toString();
        $('input[name="action_' + action + '"]').prop( 'checked', true );
      });
      // Load the github
      if (this.repository != null) {
        $('#git_host').val(this.repository.host.toString());
        $('#git_repo').val(this.repository.uri.toString());
        $('#git_rev').val(this.repository.revision.toString());
        $('#git_bool').prop( 'checked', true );
        $('#git_bool').trigger( "change" );
        // Load the git remotes
        if (this.repository.remotes != null) {
          $.each(this.repository.remotes, function(i, v) {
            $('.git-remote:last input.name').val(i);
            $('.git-remote:last input.uri').val(this);
            $('#git_remotes_fields .clone-fields').click();
          });
          $('.git-remote:last').remove();
          $('#git_remotes_bool').prop( 'checked', true );
          $('#git_remotes_bool').trigger( "change" );
        }
      }
      // Load the profile
      if (this.drupal.settings.profile != null) {
        $('#settings_profile').val(this.drupal.settings.profile.toString());
      }
      // Load the db_file location.
      if (this.drupal.settings.db_file != null) {
        // Load the string and remove the /vagrant/ we append to it.
        var db_file = this.drupal.settings. db_file.toString().substring(9)
        $('#settings_db_file').val(db_file);
      }
      // Load the docroot
      if (this.drupal.settings.docroot != null) {
        $('#settings_docroot').val(this.drupal.settings.docroot.toString())
        $('#docroot_bool').prop( 'checked', true );
        $('#docroot_bool').trigger( "change" );
      }
      // Load the files
      $('#settings_files').val(this.drupal.settings.files.toString());
      // Load the default settings.php location.
      $('#settings_settings').val(this.drupal.settings.settings.default.location.toString());
      // Load additional settings.php
      if (Object.keys(this.drupal.settings.settings).length > 1) {
        $.each(this.drupal.settings.settings, function(i,v) {
          if (i !== 'default') {
            $('.settings-addition:last input.name').val(i);
            $('.settings-addition:last input.uri').val(v.location.toString());
            $('#settings_add_fields .clone-fields').click();
          }
        });
        $('.settings-addition:last').remove();
        $('#settings_add_bool').prop( 'checked', true );
        $('#settings_add_bool').trigger( "change" );
      }
      if (this.drush_make != null) {
        $('#drush_make_api').val(this.drush_make.api);
        if (this.drush_make.template) {
          $('#drush_make_template').prop( 'checked', true );
        }
        $('#drush_make_file_default').val(this.drush_make.files.default);
        $('#drush_make_bool').prop( 'checked', true );
        $('#drush_make_bool').trigger( "change" );
        if (Object.keys(this.drush_make.files).length > 1) {
          $.each(this.drush_make.files, function(i,v) {
            if (i !== 'default') {
              $('.drush-make-file:last input.name').val(i);
              $('.drush-make-file:last input.uri').val(v);
              $('#drush_make_fields .clone-fields').click();
            }
          });
          $('.drush-make-file:last').remove();
          $('#drush_make_file_bool').prop( 'checked', true );
          $('#drush_make_file_bool').trigger( "change" );
        }
        else {
          $('#drush_make_file_bool').prop( 'checked', false );
          $('#drush_make_file_bool').trigger( "change" );
        }
      }
      else {
        $('#drush_make_bool').prop( 'checked', false );
        $('#drush_make_bool').trigger( "change" );
      }
    });
  }

  /**
   * Function to Update live text area
   */
  function updateLiveJson(site) {
    $('#live-output .site-name b').html(site.name + '.json');
    var jsonString = JSON.stringify(site, null, 2);
    $('#live-output textarea').html(jsonString);
  }

  /**
   * Bring distribution data into form.
   */
  function loadDistributions() {
    // Loop through the sites, and set the options.
    $.each(distributions, function(i) {
      var site_name  = this.name;
      $('#distributions').prepend('<option value="' + site_name + '">' + site_name + '</option>');
    });
  }

  function loadSavedSites() {
    $('#previous_sites option').remove();
    // Loop through the sites, and set the options.
    $.each(sites, function(i) {
      var site_name  = this.name;
      $('#previous_sites').prepend('<option value="' + site_name + '">' + site_name + '</option>');
    });
  }

  $('#submit').on('click', function(e) {
    e.preventDefault();
    var validate = validateForm();
    if (validate) {
      var site = createSite();
      var link = document.getElementById('downloadlink');
      link.href = makeJsonFile(JSON.stringify(site, null, 2));
      link.download = site.name + '.json';
      link.style.display = 'block';
      sites[site.name] = site;
      console.log(sites)
      // Save the site to local storage.
      localStorage.setItem('vampd', JSON.stringify(sites));
      loadSavedSites();
    }
  });

  // Update the site text area.
  $('#site_1').on('change', function(e) {
    var validate = validateForm();
    if (validate) {
      createSite();
      updateLiveJson(site);
    }
  });

  $('input[type="text"]').on('keypress', function(e) {
    var validate = validateForm();
    if (validate) {
      createSite();
      updateLiveJson(site);
    }
  });

  loadDistributions();

  // On the change of distributions, we want to autofill the form.
  $('#distributions').on('change', function(e) {
    var site_name = $(this).val();
    site = distributions[site_name];
    if (site_name !== '_none') {
      updateForm(site);
    }
    else {
      clearForm(site);
    }
  });

  loadSavedSites();

  // On the change of previous sites, we want to autofill the form
  $('#previous_sites').on('change', function(e) {
    var site_name = $(this).val();
    site = sites[site_name];
    if (site_name !== '_none') {
      updateForm(site);
    }
    else {
      clearForm(site);
    }
  });

  // Clear Sites
  $('#clear_sites').on('click', function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to remove all previously stored sites?')){
      clearPreviousSites();
      clearForm();
    }
  });

  // Clone fields
  $('.clone-fields').on('click', function(e) {
    e.preventDefault();
    var validate = validateForm();
    if (validate) {
      var cloneClass = $(this).data('clone');
      var fields = $('.' + cloneClass + ':last').clone();
      $('.' + cloneClass + ':last').after(fields);
      $('.' + cloneClass + ':last input').val('');
      $('.declone').show();
    }
    // Remove clone
    $('.declone').on('click', function(e) {
      if (cloneCount('.clone-field')) {
        $(this).parent('.clone-field').remove();
      }
      if (!cloneCount('.clone-field')) {
        $('.declone') .hide();
      }
    });
  });

})(jQuery)
