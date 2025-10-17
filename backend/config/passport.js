const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const InstagramStrategy = require("passport-instagram").Strategy;
const User = require("../models/userModel.js");
require("dotenv").config()
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    const existingUser = await User.findOne({ providerId: profile.id, provider: "google" });
    if (existingUser) return done(null, existingUser);

    const newUser = await User.create({
      providerId: profile.id,
      provider: "google",
      name: profile.displayName,
      email: profile.emails?.[0]?.value,
      photo: profile.photos?.[0]?.value
    });
    return done(null, newUser);
  }
));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT,
    clientSecret: process.env.FB_SECRET,
    callbackURL: "/auth/facebook/callback",
    profileFields: ["id", "emails", "name", "photos"]
  },
  async (accessToken, refreshToken, profile, done) => {
    const existingUser = await User.findOne({ providerId: profile.id, provider: "facebook" });
    if (existingUser) return done(null, existingUser);

    const newUser = await User.create({
      providerId: profile.id,
      provider: "facebook",
      name: `${profile.name.givenName} ${profile.name.familyName}`,
      email: profile.emails?.[0]?.value,
      photo: profile.photos?.[0]?.value
    });
    done(null, newUser);
  }
));

// Instagram Strategy
passport.use(new InstagramStrategy({
    clientID: process.env.INSTA_CLIENT,
    clientSecret: process.env.INSTA_SECRET,
    callbackURL: "/auth/instagram/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    const existingUser = await User.findOne({ providerId: profile.id, provider: "instagram" });
    if (existingUser) return done(null, existingUser);

    const newUser = await User.create({
      providerId: profile.id,
      provider: "instagram",
      name: profile.displayName,
      photo: profile.photos?.[0]?.value
    });
    done(null, newUser);
  }
));

module.exports = passport;









