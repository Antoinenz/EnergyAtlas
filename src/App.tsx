import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./lib/auth";
import CatalogScreen from "./screens/CatalogScreen";
import FlavorDetailScreen from "./screens/FlavorDetailScreen";
import MapScreen from "./screens/MapScreen";
import ProfileScreen from "./screens/ProfileScreen";
import type { CatalogStackParamList, RootTabParamList } from "./lib/types";

const CatalogStack = createNativeStackNavigator<CatalogStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function CatalogStackNavigator() {
  return (
    <CatalogStack.Navigator>
      <CatalogStack.Screen
        name="CatalogList"
        component={CatalogScreen}
        options={{ title: "Catalog" }}
      />
      <CatalogStack.Screen name="FlavorDetail" component={FlavorDetailScreen} />
    </CatalogStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen
              name="Catalog"
              component={CatalogStackNavigator}
              options={{ tabBarLabel: "Catalog" }}
            />
            <Tab.Screen name="Map" component={MapScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
