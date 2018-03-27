import React from 'react';
import AppBar from 'material-ui/AppBar';
import Button from 'material-ui/Button';
import Icon from 'material-ui/Icon';
import Toolbar from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';

const Header = ({ isSignedIn }) => (
  <AppBar position="static" color="primary">
    <Toolbar>
      <Typography variant="title" color="inherit" style={{ flexGrow: 1 }}>
        <Icon style={{ fontSize: '1.5em', verticalAlign: 'middle', marginRight: 10 }}>people</Icon>
        Groupifier
      </Typography>
      {isSignedIn
        ? <Button color="inherit">Sign out</Button>
        : <Button color="inherit">Sign in</Button>}
    </Toolbar>
  </AppBar>
);

export default Header;