import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Calendar, Users, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-material-lg">
              <Building className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">RoomBook</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">Enterprise Portal</p>
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Streamline your meeting room bookings with our comprehensive corporate portal. 
            Manage rooms, check availability, and book your meetings with ease.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="shadow-material border-0">
            <CardHeader className="text-center pb-2">
              <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Smart Booking</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Real-time availability checking with intelligent conflict prevention
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-material border-0">
            <CardHeader className="text-center pb-2">
              <Users className="h-12 w-12 text-accent mx-auto mb-2" />
              <CardTitle className="text-lg">Team Management</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Role-based access control for users and administrators
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-material border-0">
            <CardHeader className="text-center pb-2">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Enterprise Security</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Secure authentication and comprehensive audit trails
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="shadow-material-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Sign in with your corporate credentials to access the meeting room booking portal.
              </p>
              <Button 
                size="lg" 
                className="px-8 py-3 text-lg font-medium shadow-material"
                onClick={() => window.location.href = "/api/login"}
              >
                <Building className="mr-2 h-5 w-5" />
                Sign In to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
