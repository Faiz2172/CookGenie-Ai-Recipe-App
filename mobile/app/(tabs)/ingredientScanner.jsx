import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/api';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const IngredientScanner = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const navigation = useNavigation();

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled) {
        setCapturedImage(result.assets[0]);
        analyzeImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Send image to backend for analysis
  const analyzeImage = async (imageData) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageData.uri,
        type: 'image/jpeg',
        name: 'ingredient_image.jpg',
      });
      const response = await fetch(`${API_URL}/analyze-ingredients`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const result = await response.json();
      if (result.success && result.ingredients) {
        setDetectedIngredients(result.ingredients);
        if (result.recipes) {
          setRecipes(result.recipes);
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to analyze image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze image. Please check your connection.');
      console.error('Backend API Error:', error);
    } finally {
      setIsAnalyzing(false);
      setShowResults(true);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setDetectedIngredients([]);
    setRecipes([]);
    setShowResults(false);
  };

  // Handler to fetch recipe details and navigate
  const handleRecipePress = async (recipe) => {
    try {
      navigation.navigate('RecipeDetail', { recipeId: recipe.id, recipeTitle: recipe.title });
    } catch (error) {
      Alert.alert('Error', 'Failed to load recipe details.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Interface */}
      {!showResults && (
        <View style={styles.mainContent}>
          <View style={styles.header}>
            <LottieView
              source={require('../../assets/animations/scan-food.json')}
              autoPlay
              loop
              style={styles.animation}
            />
            <Text style={styles.title}>Ingredient Scanner</Text>
            <Text style={styles.subtitle}>
              Upload a photo of your ingredients and get instant recipes!
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={pickImage}
            >
              <Ionicons name="images" size={24} color="#fff" />
              <Text style={styles.buttonText}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Analysis Loading */}
      {isAnalyzing && (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/loading-food.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>Analyzing ingredients...</Text>
        </View>
      )}
      {/* Results Modal */}
      <Modal visible={showResults} animationType="slide">
        <SafeAreaView style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Scan Results</Text>
            <TouchableOpacity onPress={resetScanner}>
              <Ionicons name="close" size={30} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.resultsScroll}>
            {/* Captured Image */}
            {capturedImage && (
              <View style={styles.imageContainer}>
                <Image source={{ uri: capturedImage.uri }} style={styles.capturedImage} />
              </View>
            )}
            {/* Detected Ingredients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detected Ingredients</Text>
              <View style={styles.ingredientList}>
                {detectedIngredients.map((ingredient, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={styles.ingredientName}>{ingredient.name}</Text>
                    <Text style={styles.confidence}>{ingredient.confidence}%</Text>
                  </View>
                ))}
              </View>
            </View>
            {/* Generated Recipes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Recipes</Text>
              {recipes.map((recipe, index) => (
                <TouchableOpacity key={index} style={styles.recipeCard} onPress={() => handleRecipePress(recipe)}>
                  {recipe.image && (
                    <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                  )}
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  {recipe.instructions && (
                    <Text style={styles.recipeInstructions}>{recipe.instructions}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.newScanButton} onPress={resetScanner}>
            <Text style={styles.newScanButtonText}>Scan New Image</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#4F8EF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  resultsScroll: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  capturedImage: {
    width: width - 40,
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ingredientList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
    color: '#333',
    textTransform: 'capitalize',
  },
  confidence: {
    fontSize: 14,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recipeInstructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recipeImage: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  newScanButton: {
    backgroundColor: '#4F8EF7',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newScanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default IngredientScanner;