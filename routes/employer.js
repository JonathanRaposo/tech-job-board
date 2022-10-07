const router = require("express").Router();
const mongoose = require('mongoose')
const bcrypt = require("bcryptjs");
const { redirect } = require("express/lib/response");
const saltRounds = 10;
const isLoggedOut = require("../middleware/isLoggedOut");
const isLoggedIn = require("../middleware/isLoggedIn");
const Employer = require("../models/employer.model")
const Job = require("../models/Job.model");




router.get("/dashboard", isLoggedIn,(req, res) => {
  res.render("employer/employer", {user:req.session.user})

});

router.get("/signup", isLoggedOut, (req, res) => {
  res.render("employer/signup");
});

router.post("/signup", isLoggedOut, (req, res) => {
  const { firstname, lastname, password, email } = req.body;
  if (!email) {
    return res.status(400).render("employer/signup", {
      errorMessage: "Please provide your email.",
    });
  }

  if (password.length < 8) {
    return res.status(400).render("employer/signup", {
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
  Employer.findOne({ email }).then((found) => {
    if (found) {
      return res
        .status(400)
        .render("employer/signup", { errorMessage: "Username already taken." });
    }
    return bcrypt
      .genSalt(saltRounds)
      .then((salt) => bcrypt.hash(password, salt))
      .then((hashedPassword) => {
        return Employer.create({
          firstname,
          lastname,
          email,
          password: hashedPassword,
        });
      })
      .then((user) => {
        req.session.user = user;
        res.redirect("dashboard");
      })
      .catch((error) => {
        if (error instanceof mongoose.Error.ValidationError) {
          return res
            .status(400)
            .render("employer/signup", { errorMessage: error.message });
        }
        if (error.code === 11000) {
          return res
            .status(400)
            .render("employer/signup", { errorMessage: "Username need to be unique. The username you chose is already in use." });
        }
        return res
          .status(500)
          .render("employer/signup", { errorMessage: error.message });
      });
  });
});


router.get("/login", isLoggedOut, (req, res) => {
  res.render("employer/login");
});
router.post("/login", isLoggedOut, (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    return res
      .status(400)
      .render("employer/login", { errorMessage: "Please provide your username." });
  }

  Employer.findOne({ email })
    .then((user) => {
      if (!user) {
        return res
          .status(400)
          .render("employer/login", { errorMessage: "Wrong credentials." });
      }
      bcrypt.compare(password, user.password).then((isSamePassword) => {
        if (!isSamePassword) {
          return res
            .status(400)
            .render("employer/login", { errorMessage: "Wrong credentials." });
        }

        req.session.user = user;
        return res.redirect("dashboard");
      });
    })
    .catch((err) => {
      next(err);
       return res.status(500).render("employer/login", { errorMessage: err.message });
    });
});



router.get("/createJobPost", isLoggedIn,(req, res) => {
  console.log(req.session.user.jobs)
 res.render("employer/job-post")})



router.get("/jobs", isLoggedIn, (req,res)=>{
  console.log(req.session.user._id)
  Employer.findById(req.session.user._id)
 .populate('jobs')
  .then((updatedUser)=>{
   res.render("employer/jobs", {user:updatedUser})
  })
})
 
router.post("/createJobPost", isLoggedIn,(req, res) =>{
   const{ jobTitle, company, salary, description, location } = req.body
   Job.create( {jobTitle, company, salary, description, location })
   .then((newJob)=>{
    Employer.findByIdAndUpdate(req.session.user._id, { $push: { "jobs": newJob._id } } )
    .then((updatedEmployer) =>{
      res.redirect("jobs")
    })
   })
   .catch( (error) => {
    console.log(error);
  });
});


router.get("/:id/edit", isLoggedIn, (req,res)=>{
  const { id } = req.params;
  Job.findById(id)
  .populate('applicants')
  .then((foundJob)=>{
    console.log(foundJob)
    res.render("employer/job-edit", {user:foundJob})
  })
})
 
router.post("/:id/edit", isLoggedIn,(req, res) =>{
  const { id } = req.params;
  const{ jobTitle, company, salary, description, location } = req.body
  Job.findByIdAndUpdate(id, { jobTitle, company, salary, description, location }, { new: true })
.then((newJob)=>{
  console.log(newJob)
  res.redirect("/employer/jobs")
})
});

router.get("/:id/applicants", isLoggedIn, (req,res)=>{
  const { id } = req.params;
  Job.findById(id)
  .populate('applicants')
  .then((foundJob)=>{
    console.log(foundJob)
    res.render("employer/job-applicants", {user:foundJob})
  })
})



//Log Out
router.post("/logout",isLoggedIn, (req, res, next) => {
  req.session.destroy(err => {
    if (err) next(err);
    res.redirect("/");
  });
});

module.exports = router;
