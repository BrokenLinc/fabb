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
		function ($firebaseSimpleLogin) {
			var ref = new Firebase("https://"+FB_APP_NAME+".firebaseio.com");
			return { ref: ref, auth: $firebaseSimpleLogin(ref) };
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
		//todo: how to wait for auth to be ready...
		//can return a promise to resolve
		//kinda feel like the myfb.auth object should handle all the flagging and promising...
		if (!to.membersOnly || myfb.auth.user) return;
		e.preventDefault();
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
	function ($scope, toaster, myfb) {
		$scope.submit = function(){
			myfb.auth.$login('password', { email: $scope.email, password: $scope.password }).catch(function(){
				toaster.pop('error', "Login failed.", "Are you sure you spelled your email and password correctly?");
			});
		};
	}
);
app.controller('ForgotPasswordPageController', 
	function ($scope, toaster, myfb) {
		$scope.submit = function() {
			myfb.auth.$sendPasswordResetEmail($scope.email).then(function(){
				toaster.pop('success', "New password sent!", "Please allow a few minutes for the email to arrive in your inbox.");
			}).catch(function(){
				toaster.pop('error', "Email not sent.", "Are you sure you spelled your email address correctly?");
			});
		}
	}
);
app.controller('ChangePasswordPageController', 
	function ($scope, toaster, myfb) {
		$scope.submit = function(){
			myfb.auth.$changePassword(myfb.auth.user.email, $scope.oldPassword, $scope.newPassword).then(function(){
				toaster.pop('success', "Password changed!", "Next time you log in, use your new password.");
			}).catch(function(){
				toaster.pop('error', "Password not changed.", "Are you sure you spelled your old password correctly?");
			});
		};
	}
);
app.controller('FirebaseDemoController', 
	function ($scope, $firebase, myfb) {
		// Create a reference to the data and download it into a local object
		$scope.data = $firebase(myfb.ref.child('public')).$asObject();
		var unwatch = $scope.data.$watch(function(){
			$scope.ready = true;
			unwatch();
		});
	}
);