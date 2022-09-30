const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { redirect } = require("express/lib/response");
const User = require("../models/User.model");
const saltRounds = 10;
const isLoggedOut = require("../middleware/isLoggedOut");
const isLoggedIn = require("../middleware/isLoggedIn");

router.get("/signup", isLoggedOut, (req, res) => {
  res.render("users/signup");
});

router.post("/signup", isLoggedOut, (req, res) => {
  const { username, password, email, userType } = req.body;
  if (!username) {
    return res.status(400).render("users/signup", {
      errorMessage: "Please provide your username.",
    });
  }
  if (!email) {
    return res.status(400).render("users/signup", {
      errorMessage: "Please provide your email.",
    });
  }

  if (password.length < 8) {
    return res.status(400).render("users/signup", {
      errorMessage: "Your password needs to be at least 8 characters long.",
    });
  }
  const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;
  if (!regex.test(password)) {
    return res.status(400).render("signup", {
      errorMessage:
        "Password needs to have at least 8 chars and must contain at least one number, one lowercase and one uppercase letter.",
    });
  }
  User.findOne({ username }).then((found) => {
    if (found) {
      return res
        .status(400)
        .render("users/signup", { errorMessage: "Username already taken." });
    }
    return bcrypt
      .genSalt(saltRounds)
      .then((salt) => bcrypt.hash(password, salt))
      .then((hashedPassword) => {
        return User.create({
          userType,
          username,
          password: hashedPassword,
        });
      })
      .then((user) => {
        req.session.user = user;
        res.redirect("home");
      })
      .catch((error) => {
        if (error instanceof mongoose.Error.ValidationError) {
          return res
            .status(400)
            .render("users/signup", { errorMessage: error.message });
        }
        if (error.code === 11000) {
          return res
            .status(400)
            .render("users/signup", { errorMessage: "Username need to be unique. The username you chose is already in use." });
        }
        return res
          .status(500)
          .render("users/signup", { errorMessage: error.message });
      });
  });
});


router.get("/login", isLoggedOut, (req, res) => {
  res.render("users/login");
});
router.post("/login", isLoggedOut, (req, res, next) => {
  const { username, password } = req.body;

  if (!username) {
    return res
      .status(400)
      .render("users/login", { errorMessage: "Please provide your username." });
  }

  User.findOne({ username })
    .then((user) => {
      if (!user) {
        return res
          .status(400)
          .render("users/login", { errorMessage: "Wrong credentials." });
      }
      bcrypt.compare(password, user.password).then((isSamePassword) => {
        if (!isSamePassword) {
          return res
            .status(400)
            .render("users/login", { errorMessage: "Wrong credentials." });
        }

        req.session.user = user;
        return res.redirect("home");
      });
    })
    .catch((err) => {
      next(err);
       return res.status(500).render("users/login", { errorMessage: err.message });
    });
});

router.get("/home", isLoggedIn,(req, res) => {
  if(req.session.user.userType === "Employer")
  { res.render("users/employer", {user:req.session.user})}
else if(req.session.user.userType === "Developer"){
  res.render("users/developer", {user:req.session.user})
}
});

//Log Out
router.post("/logout",isLoggedIn, (req, res, next) => {
  req.session.destroy(err => {
    if (err) next(err);
    res.redirect("/");
  });
});

module.exports = router;
