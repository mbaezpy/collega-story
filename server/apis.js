/**
 * Storygram APIs
 * @author Marcos Baez <baez@disi.unitn.it>
 */
var https = require("https");

exports.init = function (app) {

  app.post('/api/login', function (req, res) {
    var cred = req.body;

    if (!cred.username || cred.username.trim().length === 0) {
      res.status(404).send();
      return;
    }

    fnLoadPosts(cred.username, {
      success: function (posts) {
        if (posts.items.length === 0) {
          res.status(404).send();
          return;
        }

        req.session.user = {
          username: cred.username
        };

        fnProcessPosts(req.session.user, posts);

        console.log(posts.items.length);
        res.send(req.session.user.profile);
      }
    });
  });


  app.get('/api/accounts/:id', function (req, res) {
    var id = req.params.id;

    if (id.trim().length === 0) {
      res.status(404).send();
      return;
    }

    var account = fnGetAccount(req.session.user, id);
    res.send(account);

  });

  app.post('/api/stories', function (req, res) {
    var data = req.body;
    
    var photo = fnGetPhoto(req.session.user, data.photo.id);
    var account = fnGetAccount(req.session.user, data.from.id);
    
    var person = {
      id : account.id,
      username : account.username,
      full_name : account.full_name,
      profile_picture : account.profile_picture
    };
    
    var story = {
      id: 'S' + Math.round(Math.random() * 100) + '_' + photo.id, 
      photo: photo,
      story: data.story,
      from: person,
      created_time: Math.round(Date.now() / 1000),
      feedback: []
    };    
    
    account.stories.push(story);

    res.status(200).send();

  });

  app.post('/api/photos/:id/tags', function (req, res) {
    var id = req.params.id;
    var tags = req.body;

    console.log(id);
    console.log(tags);

    var photo = fnGetPhoto(req.session.user, id);
    
    if (!photo) {
      res.status(404).send();
      return;
    }
    
    // update tags
    photo.tags.place = tags.place ? tags.place : photo.tags.place;
    photo.tags.date = tags.date ? tags.date : photo.tags.place;
    photo.tags.people = tags.people ? tags.people : photo.tags.people;
    
    res.send(photo);

  });

  // legacy code
  app.get('/api/user/:id/photos', function (req, res) {
    var id = req.params.id;

    if (id.trim().length === 0) {
      res.status(404).send();
      return;
    }

    fnLoadPosts(id, {
      success: function (posts) {
        res.send(posts);
      }
    });
  });

};

/**
 * Generates demo data from Instagram account
 */
var fnLoadPosts = function (id, cb) {

  var options = {
    hostname: "www.instagram.com",
    path: "/{0}/media/".replace("{0}", id)
  };

  https.get(options, function (response) {
    var body = '';
    response.on('data', function (d) {
      body += d;
    });
    response.on('end', function () {
      var parsed = JSON.parse(body);
      cb.success(parsed);
    });

  }).on('error', function (e) {
    if (cb.error) cb.error(e);
  });
};


/**
 * Generates demo data from Instagram account
 */
var fnProcessPosts = function (user, posts) {

  // accounts the user is managing
  user.accounts = [];
  user.profile = {};

  var person = {
    photos: [],
    stories: [],
    friends: [],
    feedback: []
  };

  // processing posts
  posts.items.forEach(function (item) {
    var photo = {
      id: item.id,
      images: {
        thumbnail: item.images.thumbnail.url,
        standard: item.images.standard_resolution.url
      },
      contributor: item.user,
      tags: {
        people: '',
        date: '',
        place: item.location? item.location.name : null
      },
      stories: [],
      created_time: item.created_time,
      visibility: ''
    };
    person.photos.push(photo);

    if (Math.random() > 0.75) {
      var story = {
        id: 'S' + photo.id,
        photo: photo,
        story: item.caption.text,
        from: item.caption.from,
        created_time: item.caption.created_time,
        feedback: []
      };
      person.stories.push(story);

      item.comments.data.forEach(function (c) {
        var feedback = {
          story: story,
          type: 'comment',
          data: c
        };
        person.feedback.push(feedback);
      });

      item.likes.data.forEach(function (l) {
        var feedback = {
          story: story,
          type: 'like',
          data: l
        };
        person.feedback.push(feedback);
      });
    }

  });

  // basic profile of the person
  var profile = person.photos[0].contributor;
  person.id = profile.id;
  person.username = profile.username;
  person.full_name = profile.full_name;
  person.profile_picture = profile.profile_picture;
  person.cover_picture = person.photos[Math.round(person.photos.length* Math.random())].images.standard;

  // The user can manage more than one account
  user.accounts.push(person);

  // Profile of the user that manages the acounts
  user.profile = profile;
  user.profile.accounts = [{
    id : user.profile.id,
    username: user.profile.username,
    full_name: user.profile.full_name
  }];

};

var fnGetAccount = function (user, accountId) {
  return user.accounts.find(function (person) {
    return person.id === accountId;
  });
};

var fnGetPhoto = function (user, photoId) {

  var photo = null;
  user.accounts.some(function (account) {

    photo = account.photos.find(function (photo) {
      return photo.id == photoId;
    });

    return photo !== undefined;
  });
  return photo;
};