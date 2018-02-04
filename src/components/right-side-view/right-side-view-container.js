import React, { Component } from 'react';

import MusicBanner from './music-banner';
// import ArtistsView from './artist-album-grid-view/artists-view';
import ArtistsGrid from '../../containers/artists-grid';

export default class RightSideViewContainer extends Component {
  render() {
    return (
      <div id="main">
        <MusicBanner />
        <ArtistsGrid />
      </div>
    );
  }
}
