import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { API_URL } from '../constants/api';

const RecipeDetail = () => {
  const route = useRoute();
  const { recipeId, recipeTitle } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    const fetchRecipeDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/recipe-detail/${recipeId}`);
        const data = await res.json();
        if (data.success && data.recipe) {
          setRecipe(data.recipe);
        } else {
          setError(data.message || 'Failed to fetch recipe details');
        }
      } catch (err) {
        setError('Failed to fetch recipe details');
      } finally {
        setLoading(false);
      }
    };
    fetchRecipeDetail();
  }, [recipeId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text>Loading recipe...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {recipe.image && <Image source={{ uri: recipe.image }} style={styles.image} />}
      <Text style={styles.title}>{recipe.title || recipeTitle}</Text>
      {recipe.extendedIngredients && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.extendedIngredients.map((ing, idx) => (
            <Text key={idx} style={styles.ingredientText}>- {ing.original}</Text>
          ))}
        </View>
      )}
      {recipe.instructions && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>{recipe.instructions.replace(/<[^>]+>/g, '')}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F8EF7',
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RecipeDetail;
