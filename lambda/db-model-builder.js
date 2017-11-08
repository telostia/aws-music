'use strict';

const { getS3Keys, getS3ObjectTags } = require('./common');

const trackBucket = process.env.TRACK_BUCKET;

const extractArtists = tracksFlatList => {
  return tracksFlatList.filter((track, index, originalArray) => {
    const foundIndex = originalArray.findIndex((searchTrack) => {
      return track.artist === searchTrack.artist;
    });
    return foundIndex === index;
  });
};

const extractAlbums = (tracksFlatList, artist) => {
  //list of all tracks with same artist, could contain different albums
  const artistsTracks = tracksFlatList.filter(track => track.artist === artist);

  return artistsTracks.filter((track, index, originalArray) => {
    return originalArray.findIndex(searchTrack => track.album === searchTrack.album) === index;
  });
};

const extractTracks = (tracksFlatList, artist, album) => {
  //list of all tracks with same artist, in same album
  return tracksFlatList.filter(track => track.artist === artist && track.album === album);
};

const createTrack = trackKey =>
  new Promise((resolve, reject) => {
    const track = trackKey;
    const tagParams = {
      Bucket: trackBucket,
      Key: track.key
    };

    getS3ObjectTags(tagParams)
      .then(trackTags => {
        trackTags.TagSet.forEach(trackTag => {
          track[`${trackTag.Key}`] = trackTag.Value;
        });
        resolve(track);
      })
      .catch(err => {
        reject(err);
      });
  });

const searchObject = (obj, term) => {
  var found = false;
  Object.keys(obj).forEach(key => {
    console.log(`Looking at key: ${key} and object key: ${obj[key]}`);
    found = (found || term === obj[key]) ? true : false;
  });

  return found;
};

const getLibraryArtist = (library, artist) => {
  var found;
  library.forEach(item => {
    if (item.artist === artist) {
      found = item;
    }
  });

  return found;
};

const getLibraryAlbum = (library, artist, album) => {
  var found;
  library.forEach(item => {
    if (item.artist === artist) {
      item.albums.forEach(existingAlbum => {
        if (existingAlbum.name === album) {
          found = item;
        }
      });
    }
  });

  return found;
};

const buildLibrary = tracks => {
  const library = [];

  // Build artists
  tracks.forEach(track => {
    if (typeof track.artist !== 'undefined') {
      const item = getLibraryArtist(library, track.artist);
      if (typeof item === 'undefined') {
        const item = {
          artist: track.artist,
          albums: []
        };
        library.push(item);
      }
      else {
        console.log(`${track.artist} already in library`);
      }
    }
  });

  // Build albums
  tracks.forEach(track => {
    const item = getLibraryAlbum(library, track.artist, track.album);
    if (typeof item === 'undefined') {
      const artist = getLibraryArtist(library, track.artist);
      if (typeof artist !== 'undefined') {
        artist.albums.push({
          name: track.album,
          tracks: []
        });
      }
    }
    else {
      console.log(`${track.album} already in library`);
    }
  });

  // Add tracks
  tracks.forEach(track => {
    const item = getLibraryAlbum(library, track.artist, track.album);
    if (typeof item !== 'undefined') {
      const album = item.albums.find(album => album.name === track.album);
      album.tracks.push({
        title: track.title,
        year: track.year
      });
    }
    else {
      console.log(`${track.title} doesn't have a place to go in library`);
    }
  });

  return library;
};

exports.handler = (event, context, callback) => {
  getS3Keys({Bucket: trackBucket})
    .then(trackKeys => {

      const trackResponses = [];
      trackKeys.forEach(trackKey => {
        trackResponses.push(createTrack(trackKey));
      });

      Promise.all(trackResponses)
        .then(tracks => {
          console.log(extractAlbums(tracks, 'London Grammar'));
          console.log(extractTracks(tracks, 'London Grammar', 'If You Wait'));
          callback(null, JSON.stringify(extractArtists(tracks)));
        })
        .catch(err => {
          callback(`Could not create all tracks: ${err}`);
        });
    })
    .catch(err => {
        callback(`Could not get track keys from S3: ${err}`)
    });
};
