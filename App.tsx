import { StatusBar } from 'expo-status-bar';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import Home from './screens/home/Home';
import Community from './screens/community/Community';
import Personal from './screens/personal/Personal';
import TasksPage from './screens/tasks/TasksPage';
import ProjectsPage from './screens/home/pages/ProjectsPage';
import './awsConfig';


type Page = {
  key: 'community' | 'home' | 'personal';
  title: string;
  subtitle: string;
  accent: string;
  background: string;
};

const pages: Page[] = [
  {
    key: 'community',
    title: 'Community',
    subtitle: 'Community features coming soon.',
    accent: '#0A84FF',
    background: '#E6F0FF',
  },
  {
    key: 'home',
    title: 'Home',
    subtitle: 'You start here. Swipe left or right to move around.',
    accent: '#0F5132',
    background: '#F0FFF4',
  },
  {
    key: 'personal',
    title: 'Personal',
    subtitle: 'Your personal space lives on the right.',
    accent: '#7C3AED',
    background: '#F5F3FF',
  },
];

export default function App() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);

  const pageIndex = useCallback((key: Page['key']) => pages.findIndex((p) => p.key === key), []);
  const goToPage = useCallback(
    (key: Page['key']) => {
      const index = pageIndex(key);
      if (index >= 0) {
        scrollRef.current?.scrollTo({ x: width * index, animated: true });
      }
    },
    [pageIndex, width],
  );
  useEffect(() => {
    const homeIndex = pageIndex('home');
    const target = homeIndex >= 0 ? width * homeIndex : width;
    scrollRef.current?.scrollTo({ x: target, animated: false });
  }, [pageIndex, width]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ height: '100%' }}
        scrollEventThrottle={16}
      >
        {pages.map((page) => (
          <View
            key={page.key}
            style={[
              page.key === 'home' ? styles.fullPage : styles.page,
              { width, backgroundColor: page.background },
            ]}
          >
            {page.key !== 'home' && (
              <>
                <Text style={[styles.label, { color: page.accent }]}>
                  {page.key.toUpperCase()}
                </Text>
                <Text style={[styles.title, { color: page.accent }]}>{page.title}</Text>
                <Text style={styles.subtitle}>{page.subtitle}</Text>
              </>
            )}

            {page.key === 'community' && <Community />}
            {page.key === 'home' && (
              <Home
                onGoTasks={() => setShowTasksModal(true)}
                onGoProjects={() => setShowProjectsModal(true)}
              />
            )}
            {page.key === 'personal' && <Personal />}
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={showTasksModal}
        animationType="slide"
        onRequestClose={() => setShowTasksModal(false)}
      >
        <View style={styles.modalWrapper}>
          <TasksPage
            onGoHome={() => {
              setShowTasksModal(false);
              goToPage('home');
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={showProjectsModal}
        animationType="slide"
        onRequestClose={() => setShowProjectsModal(false)}
      >
        <View style={styles.modalWrapper}>
          <ProjectsPage
            onGoHome={() => {
              setShowProjectsModal(false);
              goToPage('home');
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPage: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#2D2D2D',
    textAlign: 'center',
    lineHeight: 24,
  },
});
