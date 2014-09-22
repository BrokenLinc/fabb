var app = angular.module('app', [ 'ui.utils','ui.router', 'ui.bootstrap', 'toaster','firebase' ]);

//Config
app.config(function($stateProvider, $urlRouterProvider, $provide) {
	//Constants
	var FB_APP_NAME = 'brilliant-torch-4033'

	//Routes
	$stateProvider
		.state('index', {url: "/", templateUrl: "pages/index.html"})
		.state('login', {url: "/login", templateUrl: "pages/login.html", controller:'LoginPageController'})
		.state('forgot-password', {url: "/forgot-password", templateUrl: "pages/forgot-password.html", controller:'ForgotPasswordPageController'})
		.state('change-password', {url: "/change-password", templateUrl: "pages/change-password.html", controller:'ChangePasswordPageController', membersOnly: true})
		.state('firebase-demo', {url: "/firebase-demo", templateUrl: "pages/firebase-demo.html", controller:'FirebaseDemoController'})
		.state('404', {url: "/404", templateUrl: "pages/404.html"});
    $urlRouterProvider
    	.when('', '/') //Don't require a slash for home page
		.otherwise("/404");

	//Firebase reference service
	$provide.service('myfb',
		function ($firebaseSimpleLogin, $state, $rootScope) {
			var ref = new Firebase("https://"+FB_APP_NAME+".firebaseio.com");
			var auth = $firebaseSimpleLogin(ref);
			return { ref: ref, auth: auth };
		}
	);
});
app.run(function($rootScope, $state, myfb){
	//Provide auth state bindings across all views
	$rootScope.auth = myfb.auth;
	$rootScope.hasAuthenticated = false;
	myfb.auth.$getCurrentUser().then(function(){
		$rootScope.hasAuthenticated = true;
	});

	//Check permissions on states
	$rootScope.$on('$stateChangeStart', function(e, to) {
		if(to.name!='login') $rootScope.postLoginState = null;

		//todo: how to wait for auth to be ready...can return a promise to resolve...?
		//kinda feel like the myfb object should handle all the flagging and promising...
		if (!to.membersOnly || myfb.auth.user) return;

		//redirect anon user to login
		e.preventDefault();
		$rootScope.postLoginState = to.name;
		$state.go('login');
	});
});

//Controllers
app.controller('NavController', 
	function ($scope) {
		//Close the menu when the user navigates
		$scope.$on('$stateChangeStart', function () {
			$scope.isOpen = false;
		});
	}
);
app.controller('LoginPageController', 
	function ($scope, $rootScope, $state, toaster, myfb) {
		$scope.getTitle = function() {
			return $rootScope.postLoginState? 'Log in to proceed' : 'Log in';
		};
		$scope.submit = function(){
			myfb.auth.$login('password', { email: $scope.email, password: $scope.password })
				.then(function(user) {
					//forward to the originally desired
					if($rootScope.postLoginState) $state.go($rootScope.postLoginState);
				})
				.catch(function(){
					toaster.pop('error', "Login failed.", "Are you sure you spelled your email and password correctly?");
				});
		};
		$scope.errors = _.errorSummary;
	}
);
app.controller('ForgotPasswordPageController', 
	function ($scope, toaster, myfb) {
		$scope.submit = function() {
			myfb.auth.$sendPasswordResetEmail($scope.email)
				.then(function(){
					toaster.pop('success', "New password sent!", "Please allow a few minutes for the email to arrive in your inbox.");
				}).catch(function(){
					toaster.pop('error', "Email not sent.", "Are you sure you spelled your email address correctly?");
				});
		};
		$scope.errors = _.errorSummary;
	}
);
app.controller('ChangePasswordPageController', 
	function ($scope, toaster, myfb) {
		$scope.submit = function(){
			myfb.auth.$changePassword(myfb.auth.user.email, $scope.oldPassword, $scope.newPassword)
				.then(function(){
					toaster.pop('success', "Password changed!", "Next time you log in, use your new password.");
				}).catch(function(){
					toaster.pop('error', "Password not changed.", "Are you sure you spelled your old password correctly?");
				});
		};
		$scope.errors = _.errorSummary;
	}
);
app.controller('FirebaseDemoController', 
	function ($scope, $firebase, myfb) {
		// Create a reference to the data and download it into a local object
		$scope.data = $firebase(myfb.ref.child('public')).$asObject();
		//flip a flag when the data is ready
		$scope.data.$loaded().then(function(){
			$scope.ready = true;
		});
	}
);


/*** lodash mixins ***/
//capitalize the first letter of a string
_.mixin({ 'capitalize': function(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}});
//summarize the most important errors in a form
_.mixin({ 'errorSummary': function(form) {
	var e = form.$error;
	if(e.email) return _.capitalize(e.email[0].$name)+' must be a real address';
	if(e.required) return _.joinAnd(e.required, '$name')+' '+_.sipl(e.required, 'is', 'are')+' required';
}});
//make lists of things human readable
_.mixin({ 'joinAnd': function(a, prop) {
	var s = '';
	for(var i in a){
		s+=a[i][prop];
		if(i<a.length-1) s += i==a.length-2? ' and ' : ', ';
		i++;
	}
	return _.capitalize(s);
}});
//conditional singular or plural string
_.mixin({ 'sipl': function(v, s, p) {
	return v.length==1? s : p;
}});