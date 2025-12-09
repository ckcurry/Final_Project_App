import { StatusBar } from 'expo-status-bar';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import Home from './screens/home/Home';
import Community from './screens/community/Community';
import Personal from './screens/personal/Personal';
import TasksPage from './screens/tasks/TasksPage';
import ProjectsPage from './screens/home/pages/ProjectsPage';
import SignIn from './screens/auth/SignIn';
import Register from './screens/auth/Register';
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
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');

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

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await getCurrentUser();
        setAuthUser(user);
      } catch {
        setAuthUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    checkUser();
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        checkUser();
      }
      if (payload.event === 'signedOut') {
        setAuthUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignInSuccess = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setAuthUser(user);
    } catch {}
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setAuthUser(null);
    } catch {}
  }, []);

  if (authLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!authUser) {
    return authMode === 'signIn' ? (
      <SignIn
        onSignInSuccess={handleSignInSuccess}
        onSwitchToRegister={() => setAuthMode('signUp')}
      />
    ) : (
      <Register
        onRegisterSuccess={() => setAuthMode('signIn')}
        onSwitchToSignIn={() => setAuthMode('signIn')}
      />
    );
  }

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

      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Sign Out</Text>
      </TouchableOpacity>
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

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#111827',
  },
  signOut: {
    position: 'absolute',
    top: 40,
    right: 16,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
});
